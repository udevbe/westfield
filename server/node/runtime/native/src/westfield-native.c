
#include <node/node_api.h>
#include <assert.h>

#define DECLARE_NAPI_METHOD(name, func)                          \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

napi_value
start(napi_env env, napi_callback_info info) {
    // TODO get js wire message callback
    // TODO create display
    // TODO add client listener on display
    // TODO set js wire message callback when new client connects
    // TODO any cleanup?
}


napi_value
init(napi_env env, napi_value exports) {
    napi_property_descriptor desc = DECLARE_NAPI_METHOD("start", start);
    napi_status status;
    status = napi_define_properties(env, exports, 1, &desc);
    assert(status == napi_ok);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)