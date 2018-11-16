
#include <node_api.h>
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>

#include "wayland-server-core-extensions.h"
#include "connection.h"

#include "westfield-fdutils.h"

#define DECLARE_NAPI_METHOD(name, func)                          \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

struct display_destruction_listener {
    struct wl_listener listener;
    napi_env env;
    napi_ref client_creation_cb_ref;
    napi_ref global_created_cb_ref;
    napi_ref global_destroyed_cb_ref;
};

struct client_destruction_listener {
    struct wl_listener listener;
    napi_ref js_object;
    napi_ref destroy_cb_ref;
    napi_ref wire_message_cb_ref;
    napi_ref wire_message_end_cb_ref;
    napi_ref registry_created_cb_ref;
};

static void
check_status(napi_env env, napi_status status) {
    if (status != napi_ok) {
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

void
on_display_destroyed(struct wl_listener *listener, void *data) {
    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) listener;
    napi_env env = display_destruction_listener->env;

    napi_delete_reference(env, display_destruction_listener->client_creation_cb_ref);
    napi_delete_reference(env, display_destruction_listener->global_created_cb_ref);
    napi_delete_reference(env, display_destruction_listener->global_destroyed_cb_ref);
}

void
on_client_destroyed(struct wl_listener *listener, void *data) {
    struct client_destruction_listener *destruction_listener = (struct client_destruction_listener *) listener;
    if (destruction_listener->destroy_cb_ref) {
        struct wl_client *client = data;
        struct display_destruction_listener *display_destruction_listener;
        napi_value global, client_value, cb_result, cb;
        napi_status status;

        display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
                wl_client_get_display(client), on_display_destroyed);

        status = napi_get_reference_value(display_destruction_listener->env, destruction_listener->js_object,
                                          &client_value);
        check_status(display_destruction_listener->env, status);
        napi_value argv[1] = {client_value};

        status = napi_get_reference_value(display_destruction_listener->env, destruction_listener->destroy_cb_ref, &cb);
        check_status(display_destruction_listener->env, status);
        status = napi_get_global(display_destruction_listener->env, &global);
        check_status(display_destruction_listener->env, status);
        status = napi_call_function(display_destruction_listener->env, global, cb, 1, argv, &cb_result);
        check_status(display_destruction_listener->env, status);

        napi_delete_reference(display_destruction_listener->env, destruction_listener->js_object);
        if (destruction_listener->destroy_cb_ref) {
            napi_delete_reference(display_destruction_listener->env, destruction_listener->destroy_cb_ref);
        }
        if (destruction_listener->wire_message_cb_ref) {
            napi_delete_reference(display_destruction_listener->env, destruction_listener->wire_message_cb_ref);
        }
        if (destruction_listener->wire_message_end_cb_ref) {
            napi_delete_reference(display_destruction_listener->env, destruction_listener->wire_message_end_cb_ref);
        }
    }
}

int
on_wire_message(struct wl_client *client, int32_t *wire_message,
                size_t wire_message_size, int object_id, int opcode) {
    struct client_destruction_listener *destruction_listener = (struct client_destruction_listener *) wl_client_get_destroy_listener(
            client, on_client_destroyed);
    if (destruction_listener->wire_message_cb_ref) {
        struct display_destruction_listener *display_destruction_listener;
        uint32_t cb_result_consumed;
        napi_value wire_message_value, client_value, object_id_value, opcode_value, global, cb_result, cb;
        napi_status status;

        display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
                wl_client_get_display(client), on_display_destroyed);

        status = napi_create_external_arraybuffer(display_destruction_listener->env, wire_message, wire_message_size,
                                                  finalize_cb, NULL,
                                                  &wire_message_value);
        check_status(display_destruction_listener->env, status);

        napi_create_uint32(display_destruction_listener->env, (uint32_t) object_id, &object_id_value);
        check_status(display_destruction_listener->env, status);

        napi_create_uint32(display_destruction_listener->env, (uint32_t) opcode, &opcode_value);
        check_status(display_destruction_listener->env, status);

        status = napi_get_global(display_destruction_listener->env, &global);
        check_status(display_destruction_listener->env, status);
        status = napi_get_reference_value(display_destruction_listener->env, destruction_listener->js_object,
                                          &client_value);
        check_status(display_destruction_listener->env, status);
        napi_value argv[4] = {client_value, wire_message_value, object_id_value, opcode_value};

        status = napi_get_reference_value(display_destruction_listener->env, destruction_listener->wire_message_cb_ref,
                                          &cb);
        check_status(display_destruction_listener->env, status);
        status = napi_call_function(display_destruction_listener->env, global, cb, 4, argv, &cb_result);
        check_status(display_destruction_listener->env, status);

        napi_get_value_uint32(display_destruction_listener->env, cb_result, &cb_result_consumed);
        return cb_result_consumed;
    } else {
        return 0;
    }
}

void
on_wire_message_end(struct wl_client *client, int *fds_in, size_t fds_in_size) {
    struct client_destruction_listener *destruction_listener = (struct client_destruction_listener *) wl_client_get_destroy_listener(
            client, on_client_destroyed);
    if (destruction_listener->wire_message_end_cb_ref) {
        struct display_destruction_listener *display_destruction_listener;
        napi_value client_value, fds_value = NULL, global, cb_result, cb;
        napi_status status;

        display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
                wl_client_get_display(client), on_display_destroyed);

        if (fds_in_size) {
            status = napi_create_external_arraybuffer(display_destruction_listener->env, fds_in, fds_in_size,
                                                      finalize_cb, NULL, &fds_value);
            check_status(display_destruction_listener->env, status);
        } else {
            napi_get_null(display_destruction_listener->env, &fds_value);
        }

        status = napi_get_global(display_destruction_listener->env, &global);
        check_status(display_destruction_listener->env, status);
        status = napi_get_reference_value(display_destruction_listener->env, destruction_listener->js_object,
                                          &client_value);
        check_status(display_destruction_listener->env, status);

        napi_value argv[2] = {client_value, fds_value};

        status = napi_get_reference_value(display_destruction_listener->env,
                                          destruction_listener->wire_message_end_cb_ref,
                                          &cb);
        check_status(display_destruction_listener->env, status);
        status = napi_call_function(display_destruction_listener->env, global, cb, 2, argv, &cb_result);
        check_status(display_destruction_listener->env, status);
    }
}

void
on_registry_created(struct wl_client *client, struct wl_resource *registry, uint32_t registry_id) {
    struct client_destruction_listener *destruction_listener = (struct client_destruction_listener *) wl_client_get_destroy_listener(
            client,
            on_client_destroyed);

    if (destruction_listener->registry_created_cb_ref) {
        struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
                wl_client_get_display(client), on_display_destroyed);
        napi_status status;
        napi_value cb, registry_value, registry_id_value, global, cb_result;

        status = napi_create_external(display_destruction_listener->env, registry, NULL, NULL, &registry_value);
        check_status(display_destruction_listener->env, status);
        napi_create_uint32(display_destruction_listener->env, registry_id, &registry_id_value);
        napi_value argv[2] = {registry_value, registry_id_value};

        status = napi_get_reference_value(display_destruction_listener->env,
                                          destruction_listener->registry_created_cb_ref,
                                          &cb);
        check_status(display_destruction_listener->env, status);

        status = napi_get_global(display_destruction_listener->env, &global);
        check_status(display_destruction_listener->env, status);

        status = napi_call_function(display_destruction_listener->env, global, cb, 2, argv, &cb_result);
        check_status(display_destruction_listener->env, status);
    }
}

void
on_client_created(struct wl_listener *listener, void *data) {
    struct wl_client *client = data;
    struct display_destruction_listener *display_destruction_listener;
    napi_value client_value, global, cb_result, cb;
    napi_ref client_ref;
    napi_status status;

    display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            wl_client_get_display(client), on_display_destroyed);

    struct client_destruction_listener *destruction_listener = malloc(sizeof(struct client_destruction_listener));
    destruction_listener->listener.notify = on_client_destroyed;
    destruction_listener->wire_message_cb_ref = NULL;
    destruction_listener->wire_message_end_cb_ref = NULL;
    destruction_listener->registry_created_cb_ref = NULL;
    destruction_listener->destroy_cb_ref = NULL;
    wl_client_add_destroy_listener(client, &destruction_listener->listener);

    wl_client_set_wire_message_cb(client, on_wire_message);
    wl_client_set_wire_message_end_cb(client, on_wire_message_end);
    wl_client_set_registry_created_cb(client, on_registry_created);

    status = napi_create_external(display_destruction_listener->env, client, NULL, NULL, &client_value);
    check_status(display_destruction_listener->env, status);
    status = napi_create_reference(display_destruction_listener->env, client_value, 1, &client_ref);
    check_status(display_destruction_listener->env, status);
    destruction_listener->js_object = client_ref;

    status = napi_get_global(display_destruction_listener->env, &global);
    check_status(display_destruction_listener->env, status);
    napi_value argv[1] = {client_value};
    status = napi_get_reference_value(display_destruction_listener->env,
                                      display_destruction_listener->client_creation_cb_ref, &cb);
    check_status(display_destruction_listener->env, status);
    status = napi_call_function(display_destruction_listener->env, global, cb, 1, argv, &cb_result);
    check_status(display_destruction_listener->env, status);
}

// expected arguments in order:
// - Object client
// - onWireMessage(Object client, ArrayBuffer wireMessage, ArrayBuffer fdsIn):void
// return:
napi_value
setClientDestroyedCallback(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value argv[argc], client_value, js_cb;
    napi_ref js_cb_ref;
    struct wl_client *client;
    struct client_destruction_listener *destruction_listener;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_value = argv[0];
    napi_get_value_external(env, client_value, (void **) &client);

    js_cb = argv[1];
    napi_create_reference(env, js_cb, 1, &js_cb_ref);

    destruction_listener = (struct client_destruction_listener *) wl_client_get_destroy_listener(client,
                                                                                                 on_client_destroyed);
    destruction_listener->destroy_cb_ref = js_cb_ref;
}


// expected arguments in order:
// - Object client
// - onWireMessage(Object client, ArrayBuffer wireMessage, number objectId, number opcode):void
// return:
napi_value
setWireMessageCallback(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value argv[argc], client_value, js_cb;
    napi_ref js_cb_ref;
    struct wl_client *client;
    struct client_destruction_listener *destruction_listener;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_value = argv[0];
    napi_get_value_external(env, client_value, (void **) &client);

    js_cb = argv[1];
    napi_create_reference(env, js_cb, 1, &js_cb_ref);

    destruction_listener = (struct client_destruction_listener *) wl_client_get_destroy_listener(client,
                                                                                                 on_client_destroyed);
    destruction_listener->wire_message_cb_ref = js_cb_ref;
}

// expected arguments in order:
// - Object client
// - onWireMessage(Object client, ArrayBuffer fdsIn):void
// return:
napi_value
setWireMessageEndCallback(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value argv[argc], client_value, js_cb;
    napi_ref js_cb_ref;
    struct wl_client *client;
    struct client_destruction_listener *destruction_listener;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_value = argv[0];
    napi_get_value_external(env, client_value, (void **) &client);

    js_cb = argv[1];
    napi_create_reference(env, js_cb, 1, &js_cb_ref);

    destruction_listener = (struct client_destruction_listener *) wl_client_get_destroy_listener(client,
                                                                                                 on_client_destroyed);
    destruction_listener->wire_message_end_cb_ref = js_cb_ref;
}


void
on_global_created(struct wl_display *display, uint32_t global_name) {
    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            display, on_display_destroyed);
    napi_value cb, global, global_name_value, cb_result;
    napi_status status;

    status = napi_get_reference_value(display_destruction_listener->env,
                                      display_destruction_listener->global_created_cb_ref,
                                      &cb);
    check_status(display_destruction_listener->env, status);

    status = napi_get_global(display_destruction_listener->env, &global);
    check_status(display_destruction_listener->env, status);
    napi_create_uint32(display_destruction_listener->env, global_name, &global_name_value);
    napi_value argv[1] = {global_name_value};
    status = napi_call_function(display_destruction_listener->env, global, cb, 1, argv, &cb_result);
    check_status(display_destruction_listener->env, status);
}

void
on_global_destroyed(struct wl_display *display, uint32_t global_name) {
    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            display, on_display_destroyed);
    napi_value cb, global, global_name_value, cb_result;
    napi_status status;

    status = napi_get_reference_value(display_destruction_listener->env,
                                      display_destruction_listener->global_destroyed_cb_ref,
                                      &cb);
    check_status(display_destruction_listener->env, status);

    status = napi_get_global(display_destruction_listener->env, &global);
    check_status(display_destruction_listener->env, status);
    napi_create_uint32(display_destruction_listener->env, global_name, &global_name_value);
    napi_value argv[1] = {global_name_value};
    status = napi_call_function(display_destruction_listener->env, global, cb, 1, argv, &cb_result);
    check_status(display_destruction_listener->env, status);
}

// expected arguments in order:
// - onClientCreated(Object client):void
// - onGlobalCreated(number name):void
// - onGlobalDestroyed(number name):void
// return:
// - Object display
napi_value
createDisplay(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 3;
    napi_value argv[argc], display_value;
    struct wl_listener *client_creation_listener;
    struct display_destruction_listener *display_destruction_listener;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_creation_listener = malloc(sizeof(struct wl_listener));
    client_creation_listener->notify = on_client_created;

    display_destruction_listener = malloc(sizeof(struct display_destruction_listener));
    display_destruction_listener->listener.notify = on_display_destroyed;
    display_destruction_listener->env = env;

    status = napi_create_reference(env, argv[0], 1, &display_destruction_listener->client_creation_cb_ref);
    check_status(env, status);
    status = napi_create_reference(env, argv[1], 1, &display_destruction_listener->global_created_cb_ref);
    check_status(env, status);
    status = napi_create_reference(env, argv[2], 1, &display_destruction_listener->global_destroyed_cb_ref);
    check_status(env, status);

    struct wl_display *display = wl_display_create();
    wl_display_add_destroy_listener(display, &display_destruction_listener->listener);
    wl_display_add_client_created_listener(display, client_creation_listener);
    wl_display_set_global_created_cb(display, on_global_created);
    wl_display_set_global_destroyed_cb(display, on_global_destroyed);

    napi_create_external(env, display, NULL, NULL, &display_value);
    display_destruction_listener->env = NULL;
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
    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            display, on_display_destroyed);
    display_destruction_listener->env = env;

    const char *display_name = wl_display_add_socket_auto(display);
    napi_create_string_latin1(env, display_name, NAPI_AUTO_LENGTH, &display_name_value);
    display_destruction_listener->env = NULL;
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

    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            display, on_display_destroyed);
    display_destruction_listener->env = env;
    wl_display_terminate(display);
    wl_display_destroy_clients(display);
    wl_display_destroy(display);
    display_destruction_listener->env = NULL;
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
    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            display, on_display_destroyed);
    display_destruction_listener->env = env;
    wl_client_destroy(client);
    display_destruction_listener->env = NULL;
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

    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            display, on_display_destroyed);
    display_destruction_listener->env = env;
    wl_event_loop_dispatch(wl_display_get_event_loop(display), 0);
    display_destruction_listener->env = NULL;
}

// expected arguments in order:
// - Object client
// return:
// - void
napi_value
flush(napi_env env, napi_callback_info info) {
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
    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            display, on_display_destroyed);
    display_destruction_listener->env = env;
    wl_connection_flush(wl_client_get_connection(client));
    display_destruction_listener->env = NULL;
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

    struct display_destruction_listener *display_destruction_listener = (struct display_destruction_listener *) wl_display_get_destroy_listener(
            display, on_display_destroyed);
    display_destruction_listener->env = env;
    wl_display_init_shm(display);
    display_destruction_listener->env = NULL;
}

// expected arguments in order:
// - Object client
// - onRegistryCreated(Object client, Object registry, number registryId):void
// return:
napi_value
setRegistryCreatedCallback(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value argv[argc], client_value, js_cb;
    napi_ref js_cb_ref;

    struct wl_client *client;
    struct wl_display *display;
    struct client_destruction_listener *destruction_listener;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_value = argv[0];
    napi_get_value_external(env, client_value, (void **) &client);

    js_cb = argv[1];
    napi_create_reference(env, js_cb, 1, &js_cb_ref);

    destruction_listener = (struct client_destruction_listener *) wl_client_get_destroy_listener(client,
                                                                                                 on_client_destroyed);
    destruction_listener->registry_created_cb_ref = js_cb_ref;
}

napi_value
emitGlobals(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], registry_value;
    struct wl_resource *registry_resource;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    registry_value = argv[0];
    napi_get_value_external(env, registry_value, (void **) &registry_resource);
    wl_registry_emit_globals(registry_resource);
}

napi_value
createWlMessage(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 3, name_size = 64, signature_size = 16;
    napi_value argv[argc], name_value, signature_value, types_value, type_value, message_value, null_value;
    char *name, *signature;
    size_t length;
    const struct wl_interface **types;
    struct wl_message *message;
    bool is_null;

    status = napi_get_null(env, &null_value);
    check_status(env, status);

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    name_value = argv[0];
    signature_value = argv[1];
    types_value = argv[2];

    // TODO do we care about copied length for strings?
    name = calloc(1, name_size);
    signature = calloc(1, signature_size);
    status = napi_get_value_string_latin1(env, name_value, name, name_size, &length);
    check_status(env, status);
    status = napi_get_value_string_latin1(env, signature_value, signature, signature_size, &length);
    check_status(env, status);
    napi_get_array_length(env, types_value, (uint32_t *) &length);
    types = malloc(length * sizeof(struct wl_interface *));


    for (int i = 0; i < length; ++i) {
        napi_get_element(env, types_value, i, &type_value);
        status = napi_strict_equals(env, type_value, null_value, &is_null);
        if (is_null) {
            types[i] = NULL;
        } else {
            napi_get_value_external(env, type_value, (void **) (types + i));
        }
    }

    message = malloc(sizeof(struct wl_message));
    message->name = name;
    message->signature = signature;
    message->types = types;

    napi_create_external(env, message, NULL, NULL, &message_value);
    check_status(env, status);

    return message_value;
}

napi_value
createWlInterface(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 4, name_size = 64, length;
    napi_value argv[argc], name_value, version_value, requests_value, events_value, request_value, event_value, interface_value;
    struct wl_interface *interface = malloc(sizeof(struct wl_interface));
    int version;
    char *name;
    uint32_t method_count, event_count;
    struct wl_message *methods = NULL, *events = NULL, *message;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    name_value = argv[0];
    version_value = argv[1];
    requests_value = argv[2];
    events_value = argv[3];

    // TODO do we care about copied length for strings?
    name = calloc(1, name_size);
    status = napi_get_value_string_latin1(env, name_value, name, name_size, &length);
    check_status(env, status);
    status = napi_get_value_int32(env, version_value, &version);
    check_status(env, status);

    napi_get_array_length(env, requests_value, &method_count);
    check_status(env, status);
    if (method_count) {
        methods = malloc(method_count * sizeof(struct wl_message));
        for (int i = 0; i < method_count; ++i) {
            napi_get_element(env, requests_value, i, &request_value);
            napi_get_value_external(env, request_value, (void **) &message);
            methods[i] = *message;
        }
    }

    napi_get_array_length(env, requests_value, &event_count);
    check_status(env, status);
    if (event_count) {
        events = malloc(event_count * sizeof(struct wl_message));
        for (int i = 0; i < event_count; ++i) {
            napi_get_element(env, events_value, i, &event_value);
            napi_get_value_external(env, event_value, (void **) &message);
            events[i] = *message;
        }
    }

    interface->name = name;
    interface->version = version;
    interface->method_count = method_count;
    interface->methods = methods;
    interface->event_count = event_count;
    interface->events = events;

    napi_create_external(env, interface, NULL, NULL, &interface_value);
    check_status(env, status);

    return interface_value;
}

napi_value
createWlResource(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 4;
    napi_value argv[argc], interface_value, client_value, version_value, id_value, resource_value;
    struct wl_client *client;
    int id, version;
    struct wl_interface *interface;
    struct wl_resource *resource;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_value = argv[0];
    id_value = argv[1];
    version_value = argv[2];
    interface_value = argv[3];

    napi_get_value_external(env, client_value, (void **) &client);
    check_status(env, status);
    napi_get_value_int32(env, id_value, &id);
    check_status(env, status);
    napi_get_value_int32(env, version_value, &version);
    check_status(env, status);
    napi_get_value_external(env, interface_value, (void **) &interface);
    check_status(env, status);

    resource = wl_resource_create(client, interface, version, id);
    napi_create_external(env, resource, NULL, NULL, &resource_value);
    check_status(env, status);

    return resource_value;
}

napi_value
destroyWlResourceSilently(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value argv[argc], resource_value;
    struct wl_resource *resource;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    resource_value = argv[0];
    napi_get_value_external(env, resource_value, (void **) &resource);
    wl_resource_destroy_silently(resource);
}

napi_value
getShmBuffer(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value argv[argc], client_value, id_value, result;
    uint32_t id;
    struct wl_client *client;
    struct wl_resource *resource;
    struct wl_shm_buffer *shm_buffer;

    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    check_status(env, status);

    client_value = argv[0];
    id_value = argv[1];

    napi_get_value_external(env, client_value, (void **) &client);
    check_status(env, status);
    napi_get_value_uint32(env, id_value, &id);
    check_status(env, status);

    resource = wl_client_get_object(client, id);

    shm_buffer = wl_shm_buffer_get(resource);
    if (shm_buffer) {
        napi_value data_value, width_value, height_value, stride_value, format_value;

        const void *data = wl_shm_buffer_get_data(shm_buffer);
        const int32_t width = wl_shm_buffer_get_width(shm_buffer);
        const int32_t height = wl_shm_buffer_get_height(shm_buffer);
        const int32_t stride = wl_shm_buffer_get_stride(shm_buffer);
        const int32_t format = wl_shm_buffer_get_format(shm_buffer);

        napi_create_arraybuffer(env, (size_t) (stride * height), (void **) &data, &data_value);
        check_status(env, status);
        napi_create_int32(env, width, &width_value);
        check_status(env, status);
        napi_create_int32(env, height, &height_value);
        check_status(env, status);
        napi_create_int32(env, stride, &stride_value);
        check_status(env, status);
        napi_create_int32(env, format, &format_value);
        check_status(env, status);

        const napi_property_descriptor properties[] = {
                {"buffer", NULL, NULL, NULL, NULL, data_value,   napi_default, NULL},
                {"format", NULL, NULL, NULL, NULL, format_value, napi_default, NULL},
                {"width",  NULL, NULL, NULL, NULL, width_value,  napi_default, NULL},
                {"height", NULL, NULL, NULL, NULL, height_value, napi_default, NULL},
                {"stride", NULL, NULL, NULL, NULL, stride_value, napi_default, NULL},
        };

        napi_create_object(env, &result);
        check_status(env, status);
        napi_define_properties(env, result, sizeof(properties) / sizeof(napi_property_descriptor), properties);
        check_status(env, status);
        return result;
    } else {
        napi_get_null(env, &result);
        return result;
    }
}

napi_value
init(napi_env env, napi_value exports) {
    napi_status status;
    napi_property_descriptor desc[] = {
            DECLARE_NAPI_METHOD("createDisplay", createDisplay),
            DECLARE_NAPI_METHOD("destroyDisplay", destroyDisplay),
            DECLARE_NAPI_METHOD("addSocketAuto", addSocketAuto),
            DECLARE_NAPI_METHOD("getFd", getFd),
            DECLARE_NAPI_METHOD("destroyClient", destroyClient),
            DECLARE_NAPI_METHOD("sendEvents", sendEvents),
            DECLARE_NAPI_METHOD("dispatchRequests", dispatchRequests),
            DECLARE_NAPI_METHOD("flush", flush),
            DECLARE_NAPI_METHOD("createMemoryMappedFile", createMemoryMappedFile),
            DECLARE_NAPI_METHOD("initShm", initShm),
            DECLARE_NAPI_METHOD("setWireMessageCallback", setWireMessageCallback),
            DECLARE_NAPI_METHOD("setWireMessageEndCallback", setWireMessageEndCallback),
            DECLARE_NAPI_METHOD("setClientDestroyedCallback", setClientDestroyedCallback),
            DECLARE_NAPI_METHOD("setRegistryCreatedCallback", setRegistryCreatedCallback),
            DECLARE_NAPI_METHOD("emitGlobals", emitGlobals),
            DECLARE_NAPI_METHOD("createWlMessage", createWlMessage),
            DECLARE_NAPI_METHOD("createWlInterface", createWlInterface),
            DECLARE_NAPI_METHOD("createWlResource", createWlResource),
            DECLARE_NAPI_METHOD("destroyWlResourceSilently", destroyWlResourceSilently),
            DECLARE_NAPI_METHOD("getShmBuffer", getShmBuffer),
    };

    status = napi_define_properties(env, exports, sizeof(desc)/sizeof(napi_property_descriptor), desc);
    check_status(env, status);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)