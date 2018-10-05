#include "wayland-server/wayland-server.h"
#include "connection.h"

void
wl_client_set_user_data(struct wl_client *client, void *data);

void *
wl_client_get_user_data(struct wl_client *client);

struct wl_connection *
wl_client_get_connection(struct wl_client *client);

typedef int (*wl_connection_wire_message_t)(struct wl_client *client, int32_t *wire_message,
                                            size_t wire_message_length, int *fds_in, size_t fds_in_count);

void
wl_client_set_wire_message_cb(struct wl_client *client, wl_connection_wire_message_t wire_message_cb);

void
wl_display_set_user_data(struct wl_display *display, void *user_data);

void *
wl_display_get_user_data(struct wl_display *display);
