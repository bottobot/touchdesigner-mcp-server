"""
td_mcp bridge — one-time bootstrap.

Paste this whole script into TouchDesigner's Textport (Alt+T) ONCE and run it.
It constructs, using ONLY documented TD APIs:

    /td_mcp                     Base COMP   (the bridge container)
      ├─ router      Text DAT   (holds router.py — the Web Server callbacks)
      ├─ webserver   Web Server DAT  (port 9981, active, callbacks -> router)
      ├─ tokengen    Execute DAT     (mints + stores the auth token at start)
      └─ token       Text DAT   (private store for the minted token)
    /td_mcp/sandbox             Base COMP   (where all live-control edits land)

After running, the token is printed to the Textport. Copy it and set it as the
TD_MCP_TOKEN environment variable for the MCP server (see td-bridge/README.md).

Documented APIs used (see also router.py for the per-call doc citations):
  * root.create(baseCOMP, name)                       — COMP_Class.create
  * COMP.create(textDAT / webserverDAT / executeDAT, name) — COMP_Class.create
  * op.par.<name>.val = ...                            — Par_Class
  * DAT.text = ...                                     — DAT_Class
  * op.nodeX / op.nodeY                                — OP_Class
"""

# ---------------------------------------------------------------------------
# 0) Where router.py lives. The bootstrap loads router.py's source into the
#    'router' Text DAT. Adjust this path to wherever you saved td-bridge/.
#    If the file can't be read, the script falls back to leaving the router DAT
#    empty with a TODO note so you can paste the contents manually.
# ---------------------------------------------------------------------------
ROUTER_PY_PATH = 'router.py'   # e.g. 'C:/dev/touchdesigner-mcp-server/td-bridge/router.py'

BRIDGE_PATH = '/td_mcp'
SANDBOX_PATH = '/td_mcp/sandbox'
WEB_PORT = 9981


def _read_router_source():
    """Try to read router.py from disk; return its text or a placeholder."""
    try:
        with open(ROUTER_PY_PATH, 'r', encoding='utf-8') as fh:
            return fh.read()
    except Exception as e:
        return ("# TODO: paste the contents of td-bridge/router.py here.\n"
                "# bootstrap could not read %r (%s).\n"
                "def onHTTPRequest(dat, request, response):\n"
                "    response['statusCode'] = 503\n"
                "    response['statusReason'] = 'Router not installed'\n"
                "    response['data'] = 'paste router.py into this DAT'\n"
                "    return response\n" % (ROUTER_PY_PATH, e))


def build():
    # -- Bridge Base COMP at /td_mcp ----------------------------------------
    # op('/') is the documented root component. create(Type, name) — COMP_Class.
    root_comp = op('/')
    bridge = op(BRIDGE_PATH)
    if bridge is None:
        bridge = root_comp.create(baseCOMP, 'td_mcp')   # COMP_Class.create
    bridge.nodeX, bridge.nodeY = 0, 0                    # OP_Class members

    # -- Sandbox Base COMP at /td_mcp/sandbox -------------------------------
    sandbox = op(SANDBOX_PATH)
    if sandbox is None:
        sandbox = bridge.create(baseCOMP, 'sandbox')    # COMP_Class.create
    sandbox.nodeX, sandbox.nodeY = 0, -200

    # -- router Text DAT (the Web Server callbacks) -------------------------
    router = bridge.op('router')
    if router is None:
        router = bridge.create(textDAT, 'router')       # COMP_Class.create
    router.text = _read_router_source()                 # DAT_Class.text
    router.nodeX, router.nodeY = 0, 0

    # -- token Text DAT (private store) -------------------------------------
    token_dat = bridge.op('token')
    if token_dat is None:
        token_dat = bridge.create(textDAT, 'token')     # COMP_Class.create
    token_dat.nodeX, token_dat.nodeY = 200, -100
    # Keep it out of the way: it just holds the secret string.

    # -- tokengen Execute DAT (mints token at start) ------------------------
    tokengen = bridge.op('tokengen')
    if tokengen is None:
        tokengen = bridge.create(executeDAT, 'tokengen')  # COMP_Class.create
    tokengen.nodeX, tokengen.nodeY = 200, 0
    # Turn on the Start trigger so onStart() fires when the project loads /
    # when this DAT is created. Execute DAT par names (VERIFY): 'start'.
    try:
        tokengen.par.start = 1                          # Par_Class (VERIFY 'start')
    except Exception:
        pass
    # The Execute DAT body: mint a random token with secrets.token_hex and
    # store it in the private 'token' Text DAT, then print it. Uses only the
    # standard library + documented DAT.text assignment.
    tokengen.text = (
        "import secrets\n"
        "\n"
        "def onStart():\n"
        "    comp = me.parent()                # bridge Base COMP (OP_Class)\n"
        "    tok = comp.op('token')\n"
        "    if tok is not None and not str(tok.text).strip():\n"
        "        tok.text = secrets.token_hex(32)   # DAT_Class.text\n"
        "    if tok is not None:\n"
        "        print('[td_mcp] TD_MCP_TOKEN =', str(tok.text).strip())\n"
        "    return\n"
        "\n"
        "# Stubs so the Execute DAT does not error on missing callbacks.\n"
        "def onCreate():\n"
        "    onStart()\n"
        "    return\n"
        "def onExit():\n"
        "    return\n"
    )

    # Mint the token immediately for this session if empty (so the user does
    # not have to reload). secrets.token_hex — stdlib.
    import secrets
    if not str(token_dat.text).strip():
        token_dat.text = secrets.token_hex(32)          # DAT_Class.text

    # -- webserver Web Server DAT -------------------------------------------
    web = bridge.op('webserver')
    if web is None:
        web = bridge.create(webserverDAT, 'webserver')  # COMP_Class.create
    web.nodeX, web.nodeY = 400, 0
    # Verified parameter machine-names (Web Server DAT offline help):
    #   port      — connection port
    #   callbacks — DAT holding the callbacks (this is a string path/par)
    #   active    — start/stop the server
    #   secure    — TLS on/off (left default = off; we bind localhost-trust + token)
    # NOTE: the Web Server DAT has NO 'local address' parameter — it binds on
    # `port`. Localhost-only restriction is therefore NOT a parameter; rely on
    # the token + Origin/Referer guard + OS firewall (see README security model).
    web.par.port = WEB_PORT                             # Par_Class
    try:
        # callbacks par takes a DAT reference / path. Assign the router DAT.
        web.par.callbacks = router                      # Par_Class (VERIFY: op vs path)
    except Exception:
        web.par.callbacks = router.path
    web.par.active = 1                                  # Par_Class — start server

    print('=' * 64)
    print('[td_mcp] Bridge built.')
    print('[td_mcp]   bridge   :', bridge.path)
    print('[td_mcp]   sandbox  :', sandbox.path)
    print('[td_mcp]   web server: port', WEB_PORT, '(active =', web.par.active.eval(), ')')
    print('[td_mcp]')
    print('[td_mcp] SET THIS ENV VAR FOR THE MCP SERVER:')
    print('[td_mcp]   TD_MCP_TOKEN =', str(token_dat.text).strip())
    print('[td_mcp]   TD_MCP_HOST  = 127.0.0.1   (default)')
    print('[td_mcp]   TD_MCP_PORT  =', WEB_PORT, '  (default)')
    print('=' * 64)
    return bridge


# Run on paste-into-Textport.
build()
