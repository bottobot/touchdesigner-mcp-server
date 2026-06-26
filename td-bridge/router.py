"""
td_mcp bridge — Web Server DAT *Callbacks DAT* body.

Paste / point a Web Server DAT's `callbacks` parameter at a Text DAT holding
this file. It turns a running TouchDesigner into a controllable target for the
MCP server's "live control" tools, speaking the JSON command protocol:

    request  : { "id": "<uuid>", "op": "<command>", "args": { ... } }
    response : { "ok": true|false, "id", "result": <any>,
                 "errors": [...], "warnings": [...], "scriptErrors": [...],
                 "error": "<msg if !ok>" }

SECURITY MODEL (see td-bridge/README.md for the full writeup)
  * Token auth — every request must carry an `Authorization` header that
    matches the random token minted at startup (constant-time compare).
  * CSRF guard — any request bearing an `Origin` or `Referer` header is
    rejected (browsers attach those; our MCP client does not).
  * Sandbox — every *mutating* command must target a path under
    SANDBOX_ROOT ('/td_mcp/sandbox') unless the request opts out with
    args.allow_outside_sandbox == True.
  * Python off by default — the free-form `run_python` command only runs when
    args.allow_python == True (the MCP tool's schema documents this).

ONLY DOCUMENTED TouchDesigner APIs are used. Each non-obvious call is commented
with the doc page it comes from:
  * Web Server DAT Callbacks request/response dict fields —
        bin/Lib/tdutils/DATScripts/webserverDAT_callbacks.py  (ships with TD)
        request keys: method, uri, pars, clientAddress, serverAddress, data
        response keys: statusCode, statusReason, data (+ any extra, e.g.
        'content-type'); default statusCode is 404.
  * COMP.create(opType, name, initialize=True)        — COMP_Class
  * op.par.NAME.val / .expr / .pulse()                — Par_Class / Page_Class
  * Connector.connect(target)                         — Connector_Class
  * op.inputConnectors / op.outputConnectors          — OP_Class
  * COMP.findChildren(maxDepth=...)                    — COMP_Class
  * op.errors(recurse=False) / warnings / scriptErrors — OP_Class
  * op.cook(force=False, recurse=False)               — OP_Class
  * op.destroy()                                       — OP_Class
  * op.nodeX / op.nodeY                               — OP_Class
  * TOP.saveByteArray(filetype, quality, metadata)    — TOP_Class
  * TOP.sample(...) ; CHOP.chan(name)                 — TOP_Class / CHOP_Class
"""

import json
import hmac
import base64
import traceback

# ----------------------------------------------------------------------------
# Configuration. The bridge COMP is the *parent* of the Web Server DAT, i.e.
# '/td_mcp'. bootstrap.py stores the auth token on it (custom par or private
# Text DAT) — see _get_token() for the lookup order.
# ----------------------------------------------------------------------------
SANDBOX_ROOT = '/td_mcp/sandbox'   # all mutations confined here by default
TOKEN_PAR_NAME = 'Token'           # optional custom par on the bridge COMP
TOKEN_DAT_NAME = 'token'           # private Text DAT fallback (inside bridge COMP)


# ----------------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------------
def _bridge_comp(dat):
    """The bridge Base COMP that owns this Web Server DAT (its parent)."""
    # dat.parent() — OP_Class: the component containing this operator.
    return dat.parent()


def _get_token(dat):
    """
    Read the shared secret minted at startup. Lookup order:
      1) a custom parameter `Token` on the bridge COMP, then
      2) a private Text DAT named `token` inside the bridge COMP.
    Returns '' if neither is present (auth then fails closed).
    """
    comp = _bridge_comp(dat)
    try:
        # op.par.<Name> — Par_Class. Custom pars are capitalised by convention.
        p = getattr(comp.par, TOKEN_PAR_NAME, None)
        if p is not None and p.eval():
            return str(p.eval()).strip()
    except Exception:
        pass
    try:
        tok_dat = comp.op(TOKEN_DAT_NAME)
        if tok_dat is not None:
            # DAT.text — DAT_Class: full text contents.
            return str(tok_dat.text).strip()
    except Exception:
        pass
    return ''


def _header(request, name):
    """
    Case-insensitive header lookup. The TD docs guarantee method/uri/pars/
    clientAddress/serverAddress/data, and say the request dict also contains
    "any additional entries dependent on the contents of the request" — that
    is where HTTP headers land. Header-key casing is not contractually fixed,
    so scan case-insensitively. [VERIFY exact casing in-app once.]
    """
    target = name.lower()
    for k, v in request.items():
        if isinstance(k, str) and k.lower() == target:
            return v
    return None


def _collect_diagnostics(o, recurse=True):
    """
    Gather documented diagnostics from an operator. Each of errors/warnings/
    scriptErrors is op.<m>(recurse=False) per OP_Class. Returns three lists of
    strings; never raises.
    """
    def grab(method):
        try:
            res = method(recurse)          # OP_Class: errors/warnings/scriptErrors
            if not res:
                return []
            if isinstance(res, str):
                return [res]
            return [str(x) for x in res]
        except Exception:
            return []

    errs = grab(o.errors) if hasattr(o, 'errors') else []
    warns = grab(o.warnings) if hasattr(o, 'warnings') else []
    serrs = grab(o.scriptErrors) if hasattr(o, 'scriptErrors') else []
    return errs, warns, serrs


def _resolve(path):
    """op(path) lookup — returns the operator or None. (Global op())"""
    try:
        return op(path)
    except Exception:
        return None


def _in_sandbox(o):
    """True if operator o lives at/under SANDBOX_ROOT (OP_Class .path)."""
    try:
        p = o.path
    except Exception:
        return False
    return p == SANDBOX_ROOT or p.startswith(SANDBOX_ROOT + '/')


def _require_sandbox(o, args):
    """
    Raise PermissionError unless o is in the sandbox or the caller explicitly
    set allow_outside_sandbox. Mutating handlers call this before changing
    anything.
    """
    if args.get('allow_outside_sandbox'):
        return
    if not _in_sandbox(o):
        raise PermissionError(
            "Refused: '%s' is outside the sandbox %s. Pass "
            "allow_outside_sandbox=true to override." % (
                getattr(o, 'path', '?'), SANDBOX_ROOT))


def _op_summary(o):
    """A small documented-fields summary of an operator for list/echo results."""
    return {
        'name': o.name,                 # OP_Class
        'path': o.path,                 # OP_Class
        'type': o.type,                 # OP_Class (e.g. 'noise')
        'OPType': o.OPType,             # OP_Class (e.g. 'noiseTOP')
        'family': o.family,             # OP_Class (TOP/CHOP/SOP/...)
        'nodeX': o.nodeX,               # OP_Class
        'nodeY': o.nodeY,               # OP_Class
    }


# ----------------------------------------------------------------------------
# Command handlers. Each takes (dat, args) and returns a JSON-serialisable
# `result`; raising is fine — onHTTPRequest wraps everything in try/except and
# reports {ok:false,error}. Diagnostics are attached by the dispatcher for the
# commands that name a path.
# ----------------------------------------------------------------------------
def _cmd_status(dat, args):
    """Liveness/identity probe; confirms the sandbox exists."""
    comp = _bridge_comp(dat)
    sandbox = _resolve(SANDBOX_ROOT)
    return {
        'bridge': comp.path if comp else None,
        'sandbox': SANDBOX_ROOT,
        'sandboxExists': sandbox is not None,
        'tdVersion': app.version,        # td.app — application version string
        'tdBuild': app.build,            # td.app — build number
    }


def _cmd_create_operator(dat, args):
    """
    create_operator{parent, opType, name?}
    Documented: parentCOMP.create(opType, name, initialize=True) — COMP_Class.
    """
    parent_path = args['parent']
    op_type = args['opType']
    name = args.get('name')

    parent = _resolve(parent_path)
    if parent is None:
        raise ValueError("Parent COMP not found: %s" % parent_path)
    _require_sandbox(parent, args)

    # COMP.create — opType is the *string* OPType (e.g. 'noiseTOP'). The third
    # positional `initialize` defaults True (documented). name may be None, in
    # which case TD auto-names.
    if name:
        new_op = parent.create(op_type, name)
    else:
        new_op = parent.create(op_type)
    return _op_summary(new_op)


def _cmd_set_parameter(dat, args):
    """
    set_parameter{path, par, value?|expr?|pulse?}
    Documented: op.par.NAME.val / .expr / .pulse() — Par_Class.
    """
    o = _resolve(args['path'])
    if o is None:
        raise ValueError("Operator not found: %s" % args['path'])
    _require_sandbox(o, args)

    par_name = args['par']
    par = getattr(o.par, par_name, None)   # op.par.<NAME> — Par_Class
    if par is None:
        raise ValueError("Parameter '%s' not found on %s" % (par_name, o.path))

    if args.get('pulse'):
        par.pulse()                        # Par_Class.pulse()
        return {'path': o.path, 'par': par_name, 'pulsed': True}
    if 'expr' in args and args['expr'] is not None:
        par.expr = str(args['expr'])       # Par_Class.expr (string expression)
        return {'path': o.path, 'par': par_name, 'expr': par.expr}
    if 'value' in args:
        par.val = args['value']            # Par_Class.val
        return {'path': o.path, 'par': par_name, 'val': par.eval()}
    raise ValueError("set_parameter needs one of value / expr / pulse")


def _cmd_connect(dat, args):
    """
    connect{from, fromOut=0, to, toIn=0}
    Documented: op(to).inputConnectors[toIn].connect(op(from).outputConnectors[fromOut])
    — Connector.connect / OP.inputConnectors / OP.outputConnectors.
    """
    src = _resolve(args['from'])
    dst = _resolve(args['to'])
    if src is None:
        raise ValueError("Source operator not found: %s" % args['from'])
    if dst is None:
        raise ValueError("Target operator not found: %s" % args['to'])
    # Only the *destination* is mutated (a wire is added into it); guard it.
    _require_sandbox(dst, args)

    from_out = int(args.get('fromOut', 0))
    to_in = int(args.get('toIn', 0))

    out_conns = src.outputConnectors      # OP_Class
    in_conns = dst.inputConnectors        # OP_Class
    if from_out >= len(out_conns):
        raise ValueError("Source %s has no output #%d" % (src.path, from_out))
    if to_in >= len(in_conns):
        raise ValueError("Target %s has no input #%d" % (dst.path, to_in))

    # Connector.connect(target): wiring an *input* connector replaces its
    # connection with the source's output connector. (Connector_Class)
    in_conns[to_in].connect(out_conns[from_out])
    return {
        'from': src.path, 'fromOut': from_out,
        'to': dst.path, 'toIn': to_in,
        'connected': True,
    }


def _cmd_delete(dat, args):
    """delete{path}  — Documented: op.destroy() (OP_Class)."""
    o = _resolve(args['path'])
    if o is None:
        # Idempotent: nothing to delete.
        return {'path': args['path'], 'deleted': False, 'reason': 'not found'}
    _require_sandbox(o, args)
    path = o.path
    o.destroy()                            # OP_Class.destroy()
    return {'path': path, 'deleted': True}


def _cmd_clear(dat, args):
    """
    clear{parent} — destroy every child of `parent`. Documented:
    COMP.findChildren(maxDepth=1) + op.destroy() (COMP_Class / OP_Class).
    """
    parent = _resolve(args['parent'])
    if parent is None:
        raise ValueError("Parent COMP not found: %s" % args['parent'])
    _require_sandbox(parent, args)

    removed = []
    # findChildren(maxDepth=1): immediate children only. (COMP_Class)
    for child in parent.findChildren(maxDepth=1):
        try:
            p = child.path
            child.destroy()                # OP_Class.destroy()
            removed.append(p)
        except Exception:
            pass
    return {'parent': parent.path, 'removed': removed, 'count': len(removed)}


def _cmd_layout(dat, args):
    """
    layout{parent} — tidy children into a simple grid using documented
    op.nodeX / op.nodeY writable members (OP_Class). Pure positioning; no
    topological sort (kept deliberately simple and dependency-free).
    """
    parent = _resolve(args['parent'])
    if parent is None:
        raise ValueError("Parent COMP not found: %s" % args['parent'])
    _require_sandbox(parent, args)

    children = parent.findChildren(maxDepth=1)   # COMP_Class
    # Order left->right, top->bottom by current position for stability.
    children.sort(key=lambda c: (c.nodeY * -1, c.nodeX))

    col_w, row_h, per_col = 200, 150, 6
    placed = []
    for i, c in enumerate(children):
        c.nodeX = (i // per_col) * col_w        # OP_Class writable member
        c.nodeY = -(i % per_col) * row_h        # OP_Class writable member
        placed.append({'path': c.path, 'nodeX': c.nodeX, 'nodeY': c.nodeY})
    return {'parent': parent.path, 'placed': placed, 'count': len(placed)}


def _cmd_list_network(dat, args):
    """
    list_network{parent, maxDepth=1} — enumerate children with documented
    fields, plus their wiring read from input/output Connectors (OP_Class).
    Read-only: no sandbox restriction.
    """
    parent = _resolve(args['parent'])
    if parent is None:
        raise ValueError("Parent COMP not found: %s" % args['parent'])
    max_depth = int(args.get('maxDepth', 1))

    nodes = []
    # findChildren(maxDepth=...) — COMP_Class
    for c in parent.findChildren(maxDepth=max_depth):
        info = _op_summary(c)
        # Read incoming wires from the documented .inputs list (OP_Class):
        # op.inputs is the list of operators wired to this op's inputs.
        try:
            info['inputs'] = [i.path for i in c.inputs]    # OP_Class
        except Exception:
            info['inputs'] = []
        try:
            info['outputs'] = [o.path for o in c.outputs]  # OP_Class
        except Exception:
            info['outputs'] = []
        nodes.append(info)
    return {'parent': parent.path, 'maxDepth': max_depth,
            'nodes': nodes, 'count': len(nodes)}


def _cmd_get_errors(dat, args):
    """get_errors{path, recurse=true} — documented diagnostics (OP_Class)."""
    o = _resolve(args['path'])
    if o is None:
        raise ValueError("Operator not found: %s" % args['path'])
    recurse = bool(args.get('recurse', True))
    errs, warns, serrs = _collect_diagnostics(o, recurse)
    return {
        'path': o.path,
        'errors': errs,
        'warnings': warns,
        'scriptErrors': serrs,
        'totalCooks': getattr(o, 'totalCooks', None),   # OP_Class
    }


def _cmd_set_resolution(dat, args):
    """
    set_resolution{path, w, h} — set a TOP's output resolution via its
    documented resolution parameters. The common-resolution machine-names are
    `resolutionw` / `resolutionh`, and you must take the resolution off
    'use input' for them to apply: `outputresolution` menu -> 'custom'
    (menu value 'custom'). [VERIFY exact menu value name in-app.]
    All are op.par.<name> accesses (Par_Class).
    """
    o = _resolve(args['path'])
    if o is None:
        raise ValueError("Operator not found: %s" % args['path'])
    _require_sandbox(o, args)

    w = int(args['w'])
    h = int(args['h'])

    # Put the TOP onto a custom output resolution so w/h take effect.
    outres = getattr(o.par, 'outputresolution', None)   # Par_Class (VERIFY name)
    if outres is not None:
        try:
            outres.val = 'custom'                       # menu value (VERIFY)
        except Exception:
            # Some TOPs accept the menu *index*; 9 is 'Custom Resolution' on
            # the common TOP page. Fall back to that if the label is rejected.
            try:
                outres.val = 9
            except Exception:
                pass

    rw = getattr(o.par, 'resolutionw', None)            # Par_Class (VERIFY)
    rh = getattr(o.par, 'resolutionh', None)            # Par_Class (VERIFY)
    if rw is None or rh is None:
        raise ValueError(
            "%s has no resolutionw/resolutionh parameters (not a sizable TOP?)"
            % o.path)
    rw.val = w
    rh.val = h
    return {'path': o.path, 'width': w, 'height': h}


def _cmd_render(dat, args):
    """
    render{path, filetype='.png'} -> {imageBase64}
    Documented: TOP.saveByteArray(filetype, quality=1.0, metadata=[]) returns a
    bytearray of the encoded image (TOP_Class). We base64-encode it for JSON.
    """
    o = _resolve(args['path'])
    if o is None:
        raise ValueError("Operator not found: %s" % args['path'])
    if o.family != 'TOP':                  # OP_Class.family
        raise ValueError("render target must be a TOP, got %s" % o.family)

    filetype = args.get('filetype', '.png')
    o.cook(force=True)                      # OP_Class.cook(force=...)
    raw = o.saveByteArray(filetype)         # TOP_Class.saveByteArray
    b64 = base64.b64encode(bytes(raw)).decode('ascii')
    return {
        'path': o.path,
        'filetype': filetype,
        'width': o.width,                   # TOP_Class member
        'height': o.height,                 # TOP_Class member
        'imageBase64': b64,
    }


def _cmd_sample(dat, args):
    """
    sample{path, kind, ...} — read a single value out of a cooked operator.
      kind='top'  : TOP.sample(x=,y=) or (u=,v=) -> pixel tuple (TOP_Class)
      kind='chop' : CHOP.chan(name)[index] / [sampleIndex] (CHOP_Class)
    Read-only.
    """
    o = _resolve(args['path'])
    if o is None:
        raise ValueError("Operator not found: %s" % args['path'])
    kind = args.get('kind', '').lower()
    o.cook(force=True)                      # OP_Class.cook

    if kind == 'top':
        # TOP.sample(...) accepts x/y (pixels) or u/v (normalised). Pass through
        # whichever the caller provided. (TOP_Class.sample)
        kw = {}
        for key in ('x', 'y', 'u', 'v'):
            if key in args and args[key] is not None:
                kw[key] = args[key]
        px = o.sample(**kw)
        # sample() returns a colour tuple-like; coerce to a plain list.
        return {'path': o.path, 'kind': 'top', 'value': [float(c) for c in px]}

    if kind == 'chop':
        chan_name = args.get('chan')
        if chan_name is None:
            raise ValueError("sample chop needs 'chan'")
        ch = o.chan(chan_name)              # CHOP_Class.chan(name)
        if ch is None:
            raise ValueError("Channel '%s' not found on %s" % (chan_name, o.path))
        idx = int(args.get('index', 0))
        return {'path': o.path, 'kind': 'chop', 'chan': chan_name,
                'index': idx, 'value': float(ch[idx])}

    raise ValueError("sample kind must be 'top' or 'chop'")


def _cmd_run_python(dat, args):
    """
    run_python{code} — execute arbitrary Python in the TD context. GATED: only
    runs when args.allow_python is True (the MCP tool documents this and it is
    off by default). The submitted code may assign to a local `result` to
    return a value.
    """
    if not args.get('allow_python'):
        raise PermissionError(
            "run_python is disabled. The caller must set allow_python=true "
            "(the bridge owner has opted into free-form Python).")
    code = args['code']
    # Provide the standard TD globals (op, ops, app, me=this DAT) to the snippet.
    scope = {'op': op, 'ops': ops, 'app': app, 'me': dat, 'result': None}
    exec(code, scope)                       # documented: standard Python exec
    return {'result': scope.get('result')}


# Map command name -> (handler, mutating?). `mutating` is informational; each
# handler already guards its own sandbox where it changes state.
_COMMANDS = {
    'status':          _cmd_status,
    'create_operator': _cmd_create_operator,
    'set_parameter':   _cmd_set_parameter,
    'connect':         _cmd_connect,
    'delete':          _cmd_delete,
    'clear':           _cmd_clear,
    'layout':          _cmd_layout,
    'list_network':    _cmd_list_network,
    'get_errors':      _cmd_get_errors,
    'set_resolution':  _cmd_set_resolution,
    'render':          _cmd_render,
    'sample':          _cmd_sample,
    'run_python':      _cmd_run_python,
}

# Commands that name a single operator we should attach diagnostics for.
_PATH_COMMANDS = {
    'create_operator', 'set_parameter', 'connect', 'delete',
    'set_resolution', 'render', 'sample', 'get_errors',
}


# ----------------------------------------------------------------------------
# HTTP entry point
# ----------------------------------------------------------------------------
def _finish(response, status_code, status_reason, payload):
    """Fill the documented response dict and return it (Web Server DAT)."""
    response['statusCode'] = status_code            # documented response key
    response['statusReason'] = status_reason        # documented response key
    response['data'] = json.dumps(payload)          # documented response key
    # Extra fields are allowed; the docstring example uses 'content-type'.
    response['Content-Type'] = 'application/json'
    response['content-type'] = 'application/json'   # belt-and-suspenders casing
    return response


def onHTTPRequest(dat, request, response):
    """
    Web Server DAT HTTP callback.

    request keys (documented): method, uri, pars, clientAddress, serverAddress,
    data, plus any HTTP headers as extra entries.
    response keys (documented): statusCode, statusReason, data (default 404).
    """
    req_id = None
    try:
        # --- 1) CSRF guard: reject browser-originated requests outright. ----
        if _header(request, 'Origin') is not None or \
           _header(request, 'Referer') is not None:
            return _finish(response, 403, 'Forbidden',
                           {'ok': False, 'id': None,
                            'error': 'Origin/Referer header present (CSRF guard).'})

        # --- 2) Token auth (constant-time). --------------------------------
        expected = _get_token(dat)
        provided = _header(request, 'Authorization')
        provided = '' if provided is None else str(provided)
        # hmac.compare_digest — constant-time string comparison (stdlib).
        if not expected or not hmac.compare_digest(provided, expected):
            return _finish(response, 401, 'Unauthorized',
                           {'ok': False, 'id': None,
                            'error': 'Bad or missing Authorization token.'})

        # --- 3) Parse the JSON command. ------------------------------------
        raw = request.get('data')
        if raw is None or raw == '':
            return _finish(response, 400, 'Bad Request',
                           {'ok': False, 'id': None, 'error': 'Empty request body.'})
        if isinstance(raw, (bytes, bytearray)):
            raw = raw.decode('utf-8', 'replace')
        try:
            msg = json.loads(raw)
        except Exception as e:
            return _finish(response, 400, 'Bad Request',
                           {'ok': False, 'id': None,
                            'error': 'Invalid JSON body: %s' % e})

        req_id = msg.get('id')
        cmd = msg.get('op')
        args = msg.get('args') or {}
        if not isinstance(args, dict):
            return _finish(response, 400, 'Bad Request',
                           {'ok': False, 'id': req_id,
                            'error': "'args' must be an object."})

        handler = _COMMANDS.get(cmd)
        if handler is None:
            return _finish(response, 400, 'Bad Request',
                           {'ok': False, 'id': req_id,
                            'error': "Unknown command: %r" % cmd})

        # --- 4) Dispatch (each handler guards its own sandbox). -------------
        result = handler(dat, args)

        # --- 5) Attach diagnostics for path-bearing commands. --------------
        errors, warnings, script_errors = [], [], []
        if cmd in _PATH_COMMANDS:
            target_path = result.get('path') if isinstance(result, dict) else None
            if not target_path:
                target_path = args.get('path') or args.get('to')
            if target_path:
                tgt = _resolve(target_path)
                if tgt is not None:
                    errors, warnings, script_errors = _collect_diagnostics(tgt, True)

        return _finish(response, 200, 'OK', {
            'ok': True,
            'id': req_id,
            'result': result,
            'errors': errors,
            'warnings': warnings,
            'scriptErrors': script_errors,
        })

    except PermissionError as e:
        # Sandbox / python-gate violations -> 403.
        return _finish(response, 403, 'Forbidden',
                       {'ok': False, 'id': req_id, 'error': str(e)})
    except Exception as e:
        # Any other failure -> 500 with the message + traceback (defensive:
        # the callback must always return a valid response dict).
        return _finish(response, 500, 'Internal Server Error', {
            'ok': False,
            'id': req_id,
            'error': '%s: %s' % (type(e).__name__, e),
            'traceback': traceback.format_exc(),
        })


# --- WebSocket / lifecycle callbacks (unused but required to exist so the ----
# --- Web Server DAT does not error on missing names). ------------------------
def onWebSocketOpen(dat, client, uri):
    return


def onWebSocketClose(dat, client):
    return


def onWebSocketReceiveText(dat, client, data):
    return


def onWebSocketReceiveBinary(dat, client, data):
    return


def onWebSocketReceivePing(dat, client, data):
    dat.webSocketSendPong(client, data=data)   # WebserverDAT_Class
    return


def onWebSocketReceivePong(dat, client, data):
    return


def onServerStart(dat):
    return


def onServerStop(dat):
    return
