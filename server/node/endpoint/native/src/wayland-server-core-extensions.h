#include "wayland-server/wayland-server.h"
#include "connection.h"

struct wl_connection *
wl_client_get_connection(struct wl_client *client);

typedef int (*wl_connection_wire_message_t)(struct wl_client *client, int32_t *wire_message,
                                            size_t wire_message_size, int *fds_in, size_t fds_in_size);

void
wl_client_set_wire_message_cb(struct wl_client *client, wl_connection_wire_message_t wire_message_cb);
