#include "wayland-server/wayland-server.h"
#include "connection.h"

struct wl_connection *
wl_client_get_connection(struct wl_client *client);

typedef int (*wl_connection_wire_message_t)(struct wl_client *client, int32_t *wire_message,
                                            size_t wire_message_size, int *fds_in, size_t fds_in_size);

void
wl_client_set_wire_message_cb(struct wl_client *client, wl_connection_wire_message_t wire_message_cb);

typedef void (*wl_registry_created_t)(struct wl_client *client, struct wl_resource *registry, uint32_t registry_id);

void
wl_client_set_registry_created_cb(struct wl_client *client, wl_registry_created_t registry_created_cb);

void
wl_registry_emit_globals(struct wl_resource *registry_resource);

typedef void (*wl_global_cb_t)(struct wl_display *display, uint32_t name);

void
wl_display_set_global_created_cb(struct wl_display *display, wl_global_cb_t global_created_cb);

void
wl_display_set_global_destroyed_cb(struct wl_display *display, wl_global_cb_t global_destroyed_cb);
