
#include <node/node_api.h>
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>

#include "wayland-server-core-extensions.h"
#include "connection.h"

#include "westfield-fdutils.h"

#define DECLARE_NAPI_METHOD(name, func)                          \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

struct js_cb {
    napi_ref cb_ref;
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

struct client_westfield_data {
    struct client_creation_listener creation_listener;
    napi_ref js_object;
};

static void
check_status(napi_env env, napi_status status) {
    if (status != napi_ok && status != napi_pending_exception) {
        const napi_extended_error_info *result;
        assert(napi_get_last_error_info(env, &result) == napi_ok);
        printf("%s\n", result->error_message);
        assert(0);
    }
}

void
finalize_cb(napi_env env, void *finalize_data, void *finalize_hint) {
    free(finalize_data);
}

int
on_wire_message(struct wl_client *client, int32_t *wire_message, size_t wire_message_size, int *fds_in,
                size_t fds_in_size) {
    struct client_westfield_data *client_westfield_data = wl_client_get_user_data(client);
    struct js_cb js_on_client_wire_message = client_westfield_data->creation_listener.js_cb[2];
    if (js_on_client_wire_message.cb_ref) {
        uint32_t cb_result_consumed;
        napi_value wire_message_value, client_value, fds_value = NULL, global, cb_result, cb;
        napi_status status;
        napi_env env;

        env = *(napi_env *) wl_display_get_user_data(wl_client_get_display(client));

        status = napi_create_external_arraybuffer(env, wire_message, wire_message_size, finalize_cb, NULL,
                                                  &wire_message_value);
        check_status(env, status);

        if (fds_in_size) {
            status = napi_create_external_arraybuffer(env, fds_in, fds_in_size, finalize_cb, NULL, &fds_value);
            check_status(env, status);
        } else {
            napi_get_null(env, &fds_value);
        }

        status = napi_get_global(env, &global);
        check_status(env, status);
        status = napi_get_reference_value(env, client_westfield_data->js_object, &client_value);
        check_status(env, status);
        napi_value argv[3] = {client_value, wire_message_value, fds_value};

        status = napi_get_reference_value(env,
                                          js_on_client_wire_message.cb_ref,
                                          &cb);
        check_status(env, status);
        status = napi_call_function(env, global, cb, 3, argv,
                                    &cb_result);
        check_status(env, status);

        napi_get_value_uint32(env, cb_result, &cb_result_consumed);
        return cb_result_consumed;
    } else {
        return 0;
    }
}

void
on_client_destroyed(struct wl_listener *listener, void *data) {
    struct wl_client *client = data;
    struct client_destruction_listener *destruction_listener = (struct client_destruction_listener *) listener;
    struct js_cb js_on_client_destroyed = destruction_listener->js_cb;
    napi_value global, client_value, cb_result, cb;
    struct client_westfield_data *client_westfield_data;
    napi_status status;
    napi_env env;

    env = *(napi_env *) wl_display_get_user_data(wl_client_get_display(client));

    client_westfield_data = wl_client_get_user_data(client);
    status = napi_get_reference_value(env, client_westfield_data->js_object, &client_value);
    check_status(env, status);
    napi_value argv[1] = {client_value};

    status = napi_get_reference_value(env, js_on_client_destroyed.cb_ref, &cb);
    check_status(env, status);
    status = napi_get_global(env, &global);
    check_status(env, status);
    status = napi_call_function(env, global, cb, 1, argv, &cb_result);
    check_status(env, status);

    free(destruction_listener);
    napi_reference_unref(env, client_westfield_data->js_object, 0);
    napi_reference_unref(env, client_westfield_data->creation_listener.js_cb[2].cb_ref, 0);
    wl_client_set_user_data(client, NULL);
    free(client_westfield_data);
}

void
on_client_created(struct wl_listener *listener, void *data) {
    struct wl_client *client = data;
    struct client_westfield_data *client_westfield_data = (struct client_westfield_data *) listener;
    struct js_cb js_on_client_created = client_westfield_data->creation_listener.js_cb[0];
    napi_value client_value, global, cb_result, cb;
    napi_ref client_ref;
    napi_status status;
    napi_env env;

    env = *(napi_env *) wl_display_get_user_data(wl_client_get_display(client));

    struct client_destruction_listener *destruction_listener = malloc(sizeof(struct client_destruction_listener));
    destruction_listener->listener.notify = on_client_destroyed;
    destruction_listener->js_cb = client_westfield_data->creation_listener.js_cb[1];
    wl_client_add_destroy_listener(client, &destruction_listener->listener);

    wl_client_set_user_data(client, client_westfield_data);
    wl_client_set_wire_message_cb(client, on_wire_message);

    status = napi_create_external(env, client, NULL, NULL, &client_value);
    check_status(env, status);
    status = napi_create_reference(env, client_value, 1, &client_ref);
    check_status(env, status);
    client_westfield_data->js_object = client_ref;

    status = napi_get_global(env, &global);
    check_status(env, status);
    napi_value argv[1] = {client_value};
    status = napi_get_reference_value(env, js_on_client_created.cb_ref, &cb);
    check_status(env, status);
    status = napi_call_function(env, global, cb, 1, argv, &cb_result);
    check_status(env, status);
}

void
on_display_destroyed(struct wl_listener *listener, void *data) {
    struct wl_display *display = data;
    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) listener;
    napi_env env = *(napi_env *) wl_display_get_user_data(display);

    for (int i = 0; i < 3; ++i) {
        napi_delete_reference(env, display_destruction_listener->client_creation_listener->js_cb[i].cb_ref);
    }

    free(display_destruction_listener->client_creation_listener);
    free(display_destruction_listener);
}

// expected arguments in order:
// - Object client
// - onWireMessage(Object client, ArrayBuffer wireMessage, ArrayBuffer fdsIn):void
// return:
napi_value
setWireMessageCallback(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value argv[argc], client_value, js_cb;
    napi_ref js_cb_ref;
    struct wl_client *client;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_value = argv[0];
    napi_get_value_external(env, client_value, (void **) &client);

    js_cb = argv[1];
    napi_create_reference(env, js_cb, 1, &js_cb_ref);

    struct client_westfield_data *client_westfield_data = wl_client_get_user_data(client);
    client_westfield_data->creation_listener.js_cb[2].cb_ref = js_cb_ref;
}

// expected arguments in order:
// - onClientCreated(Object client):void
// - onClientDestroyed(Object client):void
// return:
// - Object display
napi_value
createDisplay(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value argv[argc], display_value;
    struct client_westfield_data *client_westfield_data;
    struct display_destruction_listener *display_destruction_listener;


    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_westfield_data = malloc(sizeof(struct client_westfield_data));
    client_westfield_data->creation_listener.listener.notify = on_client_created;


    for (int i = 0; i < argc; ++i) {
        status = napi_create_reference(env, argv[i], 1, &client_westfield_data->creation_listener.js_cb[i].cb_ref);
        check_status(env, status);
    }

    display_destruction_listener = malloc(sizeof(struct display_destruction_listener));
    display_destruction_listener->listener.notify = on_display_destroyed;
    display_destruction_listener->client_creation_listener = &client_westfield_data->creation_listener;

    struct wl_display *display = wl_display_create();
    wl_display_add_destroy_listener(display, &display_destruction_listener->listener);
    wl_display_add_client_created_listener(display, (struct wl_listener *) client_westfield_data);

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
    check_status(env, status);

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
    check_status(env, status);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    wl_display_set_user_data(display, env);
    wl_display_terminate(display);
    wl_display_destroy_clients(display);
    wl_display_destroy(display);
    wl_display_set_user_data(display, NULL);
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
    struct wl_display *display;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_value = argv[0];
    napi_get_value_external(env, client_value, (void **) &client);

    display = wl_client_get_display(client);
    wl_display_set_user_data(display, env);
    wl_client_destroy(client);
    wl_display_set_user_data(display, NULL);
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
    check_status(env, status);

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
    check_status(env, status);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    wl_display_set_user_data(display, &env);
    wl_event_loop_dispatch(wl_display_get_event_loop(display), 0);
    wl_display_set_user_data(display, NULL);
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
    check_status(env, status);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    wl_display_set_user_data(display, &env);
    wl_display_flush_clients(display);
    wl_display_set_user_data(display, NULL);
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
    check_status(env, status);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);

    fd = wl_event_loop_get_fd(wl_display_get_event_loop(display));

    status = napi_create_int32(env, fd, &fd_value);
    check_status(env, status);

    return fd_value;
}

// expected arguments in order:
// - number size
// return:
// - number
napi_value
createMemoryMappedFile(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1, size;
    napi_value argv[argc], size_value, fd_value;
    int fd;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    size_value = argv[0];
    napi_get_value_uint32(env, size_value, (uint32_t *) &size);

    fd = os_create_anonymous_file(size);
    status = napi_create_int32(env, fd, &fd_value);
    check_status(env, status);

    return fd_value;
}

// expected arguments in order:
// - Object display
// return:
// - void
napi_value
initShm(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], display_value;
    struct wl_display *display;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    display_value = argv[0];
    napi_get_value_external(env, display_value, (void **) &display);
    wl_display_init_shm(display);
}

napi_value
init(napi_env env, napi_value exports) {
    napi_status status;
    napi_property_descriptor desc[10] = {
            DECLARE_NAPI_METHOD("createDisplay", createDisplay),
            DECLARE_NAPI_METHOD("destroyDisplay", destroyDisplay),
            DECLARE_NAPI_METHOD("addSocketAuto", addSocketAuto),
            DECLARE_NAPI_METHOD("getFd", getFd),
            DECLARE_NAPI_METHOD("destroyClient", destroyClient),
            DECLARE_NAPI_METHOD("sendEvents", sendEvents),
            DECLARE_NAPI_METHOD("dispatchRequests", dispatchRequests),
            DECLARE_NAPI_METHOD("flushEvents", flushEvents),
            DECLARE_NAPI_METHOD("createMemoryMappedFile", createMemoryMappedFile),
            DECLARE_NAPI_METHOD("initShm", initShm)
    };

    status = napi_define_properties(env, exports, 10, desc);
    check_status(env, status);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)