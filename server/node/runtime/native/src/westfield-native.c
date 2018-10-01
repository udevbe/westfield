
#include <node/node_api.h>
#include <assert.h>
#include <stdlib.h>

#include "wayland-util.h"
#include "wayland-server-core.h"
#include "connection.h"

#define DECLARE_NAPI_METHOD(name, func)                          \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

struct js_cb {
    napi_env env;
    napi_value cb;
};

struct client_creation_listener {
    struct wl_listener listener;
    struct js_cb js_cb[3];
};

struct client_destruction_listener {
    struct wl_listener listener;
    struct js_cb js_cb;
};

struct display_destruction_listener {
    struct wl_listener listener;
    struct client_creation_listener *client_creation_listener;
};

void
on_wire_message(struct wl_client *client, int32_t *wire_message, size_t wire_message_count, int *fds_in,
                size_t fds_in_count) {
    struct client_creation_listener *listener_w_context = wl_client_get_user_data(client);
    struct js_cb js_on_client_wire_message = listener_w_context->js_cb[2];
    napi_value wire_message_value, fds_value, client_value, global, cb_result;
    napi_status status;

    napi_create_arraybuffer(js_on_client_wire_message.env, sizeof(int32_t) * wire_message_count,
                            (void **) &wire_message, &wire_message_value);
    napi_create_arraybuffer(js_on_client_wire_message.env, sizeof(int) * fds_in_count, (void **) &fds_in, &fds_value);
    napi_create_external(js_on_client_wire_message.env, client, NULL, NULL, &client_value);

    status = napi_get_global(js_on_client_wire_message.env, &global);
    assert(status == napi_ok);
    napi_value argv[3] = {client_value, wire_message_value, fds_value};
    status = napi_call_function(js_on_client_wire_message.env, global, js_on_client_wire_message.cb, 3, argv,
                                &cb_result);
    assert(status == napi_ok);
}

void
on_client_destroyed(struct wl_listener *listener, void *data) {
    struct wl_client *client = data;
    struct client_destruction_listener *destruction_listener = (struct client_destruction_listener *) listener;
    struct js_cb js_on_client_destroyed = destruction_listener->js_cb;
    napi_value client_value, global, cb_result;
    napi_status status;

    napi_create_external(js_on_client_destroyed.env, client, NULL, NULL, &client_value);

    status = napi_get_global(js_on_client_destroyed.env, &global);
    assert(status == napi_ok);
    napi_value argv[1] = {client_value};
    status = napi_call_function(js_on_client_destroyed.env, global, js_on_client_destroyed.cb, 1, argv, &cb_result);
    assert(status == napi_ok);

    free(destruction_listener);
}

void
on_client_created(struct wl_listener *listener, void *data) {
    struct wl_client *client = data;
    struct client_creation_listener *creation_listener = (struct client_creation_listener *) listener;
    struct js_cb js_on_client_created = creation_listener->js_cb[0];
    napi_value client_value, global, cb_result;
    napi_status status;

    struct client_destruction_listener *destruction_listener = malloc(sizeof(struct client_destruction_listener));
    destruction_listener->listener.notify = on_client_destroyed;
    destruction_listener->js_cb = creation_listener->js_cb[1];
    wl_client_add_destroy_listener(client, &destruction_listener->listener);

    wl_client_set_user_data(client, creation_listener);
    wl_client_set_wire_message_cb(client, on_wire_message);

    napi_create_external(js_on_client_created.env, client, NULL, NULL, &client_value);
    status = napi_get_global(js_on_client_created.env, &global);
    assert(status == napi_ok);
    napi_value argv[1] = {client_value};
    status = napi_call_function(js_on_client_created.env, global, js_on_client_created.cb, 1, argv, &cb_result);
    assert(status == napi_ok);
}

void
on_display_destroyed(struct wl_listener *listener, void *data) {
    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) listener;
    free(display_destruction_listener->client_creation_listener);
    free(display_destruction_listener);
}

// expected arguments in order:
// - onClientCreated(Object client):void
// - onClientDestroyed(Object client):void
// - onWireMessage(Object client, ArrayBuffer wireMessage, ArrayBuffer fdsIn):void
// return:
// - Object display
napi_value
createDisplay(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 3;
    napi_value argv[argc], display_value;
    struct client_creation_listener *client_creation_listener;
    struct display_destruction_listener *display_destruction_listener;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    assert(status == napi_ok);

    client_creation_listener = malloc(sizeof(struct client_creation_listener));
    client_creation_listener->listener.notify = on_client_created;

    for (int i = 0; i < argc; ++i) {
        client_creation_listener->js_cb[i].env = env;
        // TODO assert argv[i] is a js function
        client_creation_listener->js_cb[i].cb = argv[i];
    }

    display_destruction_listener = malloc(sizeof(struct display_destruction_listener));
    display_destruction_listener->listener.notify = on_display_destroyed;
    display_destruction_listener->client_creation_listener = client_creation_listener;

    struct wl_display *display = wl_display_create();
    wl_display_add_destroy_listener(display, &display_destruction_listener->listener);
    wl_display_add_client_created_listener(display, &client_creation_listener->listener);

    napi_create_external(env, display, NULL, NULL, &display_value);
    return display_value;
}

// expected arguments in order:
// - Object display
// return:
// - string
napi_value
addSocketAuto(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], display_value, display_name_value;
    struct wl_display *display;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    assert(status == napi_ok);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    const char *display_name = wl_display_add_socket_auto(display);
    napi_create_string_latin1(env, display_name, NAPI_AUTO_LENGTH, &display_name_value);

    return display_name_value;
}

// expected arguments in order:
// - Object display
// return:
// - void
napi_value
destroyDisplay(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], display_value;
    struct wl_display *display;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    assert(status == napi_ok);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    wl_display_terminate(display);
    wl_display_destroy_clients(display);
    wl_display_destroy(display);
}

// expected arguments in order:
// - Object client
// return:
// - void
napi_value
destroyClient(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], client_value;
    struct wl_client *client;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    assert(status == napi_ok);

    client_value = argv[0];
    napi_get_value_external(env, client_value, (void **) &client);

    wl_client_destroy(client);
}

// expected arguments in order:
// - Object client
// - ArrayBuffer messages
// - ArrayBuffer fds
// return:
// - void
napi_value
sendEvents(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 3;
    napi_value argv[argc], client_value, messages_value, fds_value;
    struct wl_client *client;
    struct wl_connection *connection;
    void *messages;
    int *fds;
    size_t messages_length, fds_byte_length, fds_length;


    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    assert(status == napi_ok);

    client_value = argv[0];
    napi_get_value_external(env, client_value, (void **) &client);

    messages_value = argv[1];
    napi_get_arraybuffer_info(env, messages_value, &messages, &messages_length);

    fds_value = argv[2];
    napi_get_arraybuffer_info(env, fds_value, (void **) &fds, &fds_byte_length);
    fds_length = fds_byte_length / sizeof(int);

    connection = wl_client_get_connection(client);
    wl_connection_write(connection, messages, messages_length);
    for (int i = 0; i < fds_length; ++i) {
        wl_connection_put_fd(connection, fds[i]);
    }
}

// expected arguments in order:
// - Object display
// return:
// - void
napi_value
dispatchRequests(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], display_value;
    struct wl_display *display;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    assert(status == napi_ok);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    wl_event_loop_dispatch(wl_display_get_event_loop(display), 0);
}

// expected arguments in order:
// - Object display
// return:
// - void
napi_value
flushEvents(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], display_value;
    struct wl_display *display;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    assert(status == napi_ok);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    wl_display_flush_clients(display);
}

// expected arguments in order:
// - Object display
// return:
// - number
napi_value
getFd(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], display_value, fd_value;
    struct wl_display *display;
    int fd;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    assert(status == napi_ok);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    fd = wl_event_loop_get_fd(wl_display_get_event_loop(display));

    status = napi_create_int32(env, fd, &fd_value);
    assert(status == napi_ok);

    return fd_value;
}

napi_value
init(napi_env env, napi_value exports) {
    napi_status status;
    napi_property_descriptor desc[8] = {
            DECLARE_NAPI_METHOD("createDisplay", createDisplay),
            DECLARE_NAPI_METHOD("destroyDisplay", destroyDisplay),
            DECLARE_NAPI_METHOD("addSocketAuto", addSocketAuto),
            DECLARE_NAPI_METHOD("getFd", getFd),
            DECLARE_NAPI_METHOD("destroyClient", destroyClient),
            DECLARE_NAPI_METHOD("sendEvents", sendEvents),
            DECLARE_NAPI_METHOD("dispatchRequests", dispatchRequests),
            DECLARE_NAPI_METHOD("flushEvents", flushEvents)
    };

    status = napi_define_properties(env, exports, 8, desc);
    assert(status == napi_ok);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)