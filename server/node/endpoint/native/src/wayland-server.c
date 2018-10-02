/*
 * Copyright © 2008 Kristian Høgsberg
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice (including the
 * next paragraph) shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT.  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

#define _GNU_SOURCE

#include <stdlib.h>
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdarg.h>
#include <stdbool.h>
#include <errno.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <dlfcn.h>
#include <assert.h>
#include <sys/time.h>
#include <fcntl.h>
#include <sys/file.h>
#include <sys/stat.h>

#include "wayland-util.h"
#include "wayland-private.h"
#include "wayland-server.h"
#include "wayland-os.h"
#include "connection.h"


/* This is the size of the char array in struct sock_addr_un.
 * No Wayland socket can be created with a path longer than this,
 * including the null terminator.
 */
#ifndef UNIX_PATH_MAX
#define UNIX_PATH_MAX    108
#endif

#define LOCK_SUFFIX    ".lock"
#define LOCK_SUFFIXLEN    5

struct wl_socket {
    int fd;
    int fd_lock;
    struct sockaddr_un addr;
    char lock_addr[UNIX_PATH_MAX + LOCK_SUFFIXLEN];
    struct wl_list link;
    struct wl_event_source *source;
    char *display_name;
};

struct wl_client {
    struct wl_connection *connection;
    struct wl_event_source *source;
    struct wl_display *display;
    void *user_data;
    wl_connection_wire_message_t wire_message_cb;
    struct wl_list link;
    struct wl_priv_signal destroy_signal;
    struct ucred ucred;
    int error;
};

struct wl_display {
    struct wl_event_loop *loop;
    void* user_data;
    int run;

    struct wl_list socket_list;
    struct wl_list client_list;
    struct wl_list protocol_loggers;

    struct wl_priv_signal destroy_signal;
    struct wl_priv_signal create_client_signal;
};

static void
destroy_client_with_error(struct wl_client *client, const char *reason) {
    printf("%s (pid %u)\n", reason, client->ucred.pid);
    wl_client_destroy(client);
}

static int
wl_client_connection_data(int fd, uint32_t mask, void *data) {
    struct wl_client *client = data;
    struct wl_connection *connection = client->connection;
    uint32_t p[2];
    size_t size, fds_in_count;
    int len;

    if (mask & WL_EVENT_HANGUP) {
        wl_client_destroy(client);
        return 1;
    }

    if (mask & WL_EVENT_ERROR) {
        destroy_client_with_error(client, "socket error");
        return 1;
    }

    if (mask & WL_EVENT_WRITABLE) {
        len = wl_connection_flush(connection);
        if (len < 0 && errno != EAGAIN) {
            destroy_client_with_error(
                    client, "failed to flush client connection");
            return 1;
        } else if (len >= 0) {
            wl_event_source_fd_update(client->source,
                                      WL_EVENT_READABLE);
        }
    }

    len = 0;
    if (mask & WL_EVENT_READABLE) {
        len = wl_connection_read(connection);
        if (len == 0 || (len < 0 && errno != EAGAIN)) {
            destroy_client_with_error(
                    client, "failed to read client connection");
            return 1;
        }
    }

    while (len >= 0 && (size_t) len >= sizeof p) {
        wl_connection_copy(connection, p, sizeof p);
        size = p[1] >> 16;
        if (len < size)
            break;


        if (size % sizeof(int32_t)) {
            destroy_client_with_error(
                    client, "Client send wire message not structured as 32-bit words.");
            return 1;
        }

        int32_t buffer[size / sizeof(int32_t)];
        wl_connection_copy(connection, buffer, size);

        fds_in_count = wl_connection_fds_in_count(connection);
        int fds_in[fds_in_count];

        for (int i = 0; i < fds_in_count; ++i) {
            wl_connection_read_next_fd_in(connection, fds_in + i);
        }

        wl_connection_consume(connection, size);

        if (client->wire_message_cb) {
            client->wire_message_cb(client, buffer, size, fds_in, fds_in_count);
        }

        if (client->error)
            break;

        len = wl_connection_pending_input(connection);
    }

    if (client->error) {
        destroy_client_with_error(client,
                                  "error in client communication");
    }

    return 1;
}

/** Flush pending events to the client
 *
 * \param client The client object
 *
 * Events sent to clients are queued in a buffer and written to the
 * socket later - typically when the compositor has handled all
 * requests and goes back to block in the event loop.  This function
 * flushes all queued up events for a client immediately.
 *
 * \memberof wl_client
 */
WL_EXPORT void
wl_client_flush(struct wl_client *client) {
    wl_connection_flush(client->connection);
}

/** Get the display object for the given client
 *
 * \param client The client object
 * \return The display object the client is associated with.
 *
 * \memberof wl_client
 */
WL_EXPORT struct wl_display *
wl_client_get_display(struct wl_client *client) {
    return client->display;
}

void
wl_client_set_wire_message_cb(struct wl_client *client, wl_connection_wire_message_t wire_message_cb) {
    client->wire_message_cb = wire_message_cb;
}

void
wl_client_set_user_data(struct wl_client *client, void *data) {
    client->user_data = data;
}

void *
wl_client_get_user_data(struct wl_client *client) {
    return client->user_data;
}

struct wl_connection *
wl_client_get_connection(struct wl_client *client) {
    return client->connection;
}

/** Create a client for the given file descriptor
 *
 * \param display The display object
 * \param fd The file descriptor for the socket to the client
 * \return The new client object or NULL on failure.
 *
 * Given a file descriptor corresponding to one end of a socket, this
 * function will create a wl_client struct and add the new client to
 * the compositors client list.  At that point, the client is
 * initialized and ready to run, as if the client had connected to the
 * servers listening socket.  When the client eventually sends
 * requests to the compositor, the wl_client argument to the request
 * handler will be the wl_client returned from this function.
 *
 * The other end of the socket can be passed to
 * wl_display_connect_to_fd() on the client side or used with the
 * WAYLAND_SOCKET environment variable on the client side.
 *
 * Listeners added with wl_display_add_client_created_listener() will
 * be notified by this function after the client is fully constructed.
 *
 * On failure this function sets errno accordingly and returns NULL.
 *
 * \memberof wl_display
 */
WL_EXPORT struct wl_client *
wl_client_create(struct wl_display *display, int fd) {
    struct wl_client *client;
    socklen_t len;

    client = zalloc(sizeof *client);
    if (client == NULL)
        return NULL;

    client->display = display;
    client->source = wl_event_loop_add_fd(display->loop, fd,
                                          WL_EVENT_READABLE,
                                          wl_client_connection_data, client);

    if (!client->source)
        goto err_client;

    len = sizeof client->ucred;
    if (getsockopt(fd, SOL_SOCKET, SO_PEERCRED,
                   &client->ucred, &len) < 0)
        goto err_source;

    client->connection = wl_connection_create(fd);
    if (client->connection == NULL)
        goto err_source;

    wl_priv_signal_init(&client->destroy_signal);

    wl_list_insert(display->client_list.prev, &client->link);

    wl_priv_signal_emit(&display->create_client_signal, client);

    return client;

    err_source:
    wl_event_source_remove(client->source);
    err_client:
    free(client);
    return NULL;
}

/** Return Unix credentials for the client
 *
 * \param client The display object
 * \param pid Returns the process ID
 * \param uid Returns the user ID
 * \param gid Returns the group ID
 *
 * This function returns the process ID, the user ID and the group ID
 * for the given client.  The credentials come from getsockopt() with
 * SO_PEERCRED, on the client socket fd.  All the pointers can be
 * NULL, if the caller is not interested in a particular ID.
 *
 * Be aware that for clients that a compositor forks and execs and
 * then connects using socketpair(), this function will return the
 * credentials for the compositor.  The credentials for the socketpair
 * are set at creation time in the compositor.
 *
 * \memberof wl_client
 */
WL_EXPORT void
wl_client_get_credentials(struct wl_client *client,
                          pid_t *pid, uid_t *uid, gid_t *gid) {
    if (pid)
        *pid = client->ucred.pid;
    if (uid)
        *uid = client->ucred.uid;
    if (gid)
        *gid = client->ucred.gid;
}

/** Get the file descriptor for the client
 *
 * \param client The display object
 * \return The file descriptor to use for the connection
 *
 * This function returns the file descriptor for the given client.
 *
 * Be sure to use the file descriptor from the client for inspection only.
 * If the caller does anything to the file descriptor that changes its state,
 * it will likely cause problems.
 *
 * See also wl_client_get_credentials().
 * It is recommended that you evaluate whether wl_client_get_credentials()
 * can be applied to your use case instead of this function.
 *
 * If you would like to distinguish just between the client and the compositor
 * itself from the client's request, it can be done by getting the client
 * credentials and by checking the PID of the client and the compositor's PID.
 * Regarding the case in which the socketpair() is being used, you need to be
 * careful. Please note the documentation for wl_client_get_credentials().
 *
 * This function can be used for a compositor to validate a request from
 * a client if there are additional information provided from the client's
 * file descriptor. For instance, suppose you can get the security contexts
 * from the client's file descriptor. The compositor can validate the client's
 * request with the contexts and make a decision whether it permits or deny it.
 *
 * \memberof wl_client
 */
WL_EXPORT int
wl_client_get_fd(struct wl_client *client) {
    return wl_connection_get_fd(client->connection);
}

WL_EXPORT void
wl_client_add_destroy_listener(struct wl_client *client,
                               struct wl_listener *listener) {
    wl_priv_signal_add(&client->destroy_signal, listener);
}

WL_EXPORT struct wl_listener *
wl_client_get_destroy_listener(struct wl_client *client,
                               wl_notify_func_t notify) {
    return wl_priv_signal_get(&client->destroy_signal, notify);
}

WL_EXPORT void
wl_client_destroy(struct wl_client *client) {
    wl_priv_signal_final_emit(&client->destroy_signal, client);

    wl_client_flush(client);
    wl_event_source_remove(client->source);
    close(wl_connection_destroy(client->connection));
    wl_list_remove(&client->link);
    free(client);
}


/** Create Wayland display object.
 *
 * \return The Wayland display object. Null if failed to create
 *
 * This creates the wl_display object.
 *
 * \memberof wl_display
 */
WL_EXPORT struct wl_display *
wl_display_create(void) {
    struct wl_display *display;

    display = malloc(sizeof *display);
    if (display == NULL)
        return NULL;

    display->loop = wl_event_loop_create();
    if (display->loop == NULL) {
        free(display);
        return NULL;
    }

    wl_list_init(&display->socket_list);
    wl_list_init(&display->client_list);
    wl_list_init(&display->protocol_loggers);

    wl_priv_signal_init(&display->destroy_signal);
    wl_priv_signal_init(&display->create_client_signal);

    return display;
}

void
wl_display_set_user_data(struct wl_display *display, void* user_data) {
    display->user_data = user_data;
}

void*
wl_display_get_user_data(struct wl_display *display) {
    return display->user_data;
}

static void
wl_socket_destroy(struct wl_socket *s) {
    if (s->source)
        wl_event_source_remove(s->source);
    if (s->addr.sun_path[0])
        unlink(s->addr.sun_path);
    if (s->fd >= 0)
        close(s->fd);
    if (s->lock_addr[0])
        unlink(s->lock_addr);
    if (s->fd_lock >= 0)
        close(s->fd_lock);

    free(s);
}

static struct wl_socket *
wl_socket_alloc(void) {
    struct wl_socket *s;

    s = zalloc(sizeof *s);
    if (!s)
        return NULL;

    s->fd = -1;
    s->fd_lock = -1;

    return s;
}

/** Destroy Wayland display object.
 *
 * \param display The Wayland display object which should be destroyed.
 * \return None.
 *
 * This function emits the wl_display destroy signal, releases
 * all the sockets added to this display, free's all the globals associated
 * with this display, free's memory of additional shared memory formats and
 * destroy the display object.
 *
 * \sa wl_display_add_destroy_listener
 *
 * \memberof wl_display
 */
WL_EXPORT void
wl_display_destroy(struct wl_display *display) {
    struct wl_socket *s, *next;
    struct wl_global *global, *gnext;

    wl_priv_signal_final_emit(&display->destroy_signal, display);

    wl_list_for_each_safe(s, next, &display->socket_list, link) {
        wl_socket_destroy(s);
    }
    wl_event_loop_destroy(display->loop);

    wl_list_remove(&display->protocol_loggers);

    free(display);
}

WL_EXPORT struct wl_event_loop *
wl_display_get_event_loop(struct wl_display *display) {
    return display->loop;
}

WL_EXPORT void
wl_display_terminate(struct wl_display *display) {
    display->run = 0;
}

WL_EXPORT void
wl_display_run(struct wl_display *display) {
    display->run = 1;

    while (display->run) {
        wl_display_flush_clients(display);
        wl_event_loop_dispatch(display->loop, -1);
    }
}

WL_EXPORT void
wl_display_flush_clients(struct wl_display *display) {
    struct wl_client *client, *next;
    int ret;

    wl_list_for_each_safe(client, next, &display->client_list, link) {
        ret = wl_connection_flush(client->connection);
        if (ret < 0 && errno == EAGAIN) {
            wl_event_source_fd_update(client->source,
                                      WL_EVENT_WRITABLE |
                                      WL_EVENT_READABLE);
        } else if (ret < 0) {
            wl_client_destroy(client);
        }
    }
}

/** Destroy all clients connected to the display
 *
 * \param display The display object
 *
 * This function should be called right before wl_display_destroy() to ensure
 * all client resources are closed properly. Destroying a client from within
 * wl_display_destroy_clients() is safe, but creating one will leak resources
 * and raise a warning.
 *
 * \memberof wl_display
 */
WL_EXPORT void
wl_display_destroy_clients(struct wl_display *display) {
    struct wl_list tmp_client_list, *pos;
    struct wl_client *client;

    /* Move the whole client list to a temporary head because some new clients
     * might be added to the original head. */
    wl_list_init(&tmp_client_list);
    wl_list_insert_list(&tmp_client_list, &display->client_list);
    wl_list_init(&display->client_list);

    /* wl_list_for_each_safe isn't enough here: it fails if the next client is
     * destroyed by the destroy handler of the current one. */
    while (!wl_list_empty(&tmp_client_list)) {
        pos = tmp_client_list.next;
        client = wl_container_of(pos, client, link);

        wl_client_destroy(client);
    }

    if (!wl_list_empty(&display->client_list)) {
        printf("wl_display_destroy_clients: cannot destroy all clients because "
               "new ones were created by destroy callbacks\n");
    }
}

static int
socket_data(int fd, uint32_t mask, void *data) {
    struct wl_display *display = data;
    struct sockaddr_un name;
    socklen_t length;
    int client_fd;

    length = sizeof name;
    client_fd = wl_os_accept_cloexec(fd, (struct sockaddr *) &name,
                                     &length);
    if (client_fd < 0)
        printf("failed to accept: %m\n");
    else if (!wl_client_create(display, client_fd))
        close(client_fd);

    return 1;
}

static int
wl_socket_lock(struct wl_socket *socket) {
    struct stat socket_stat;

    snprintf(socket->lock_addr, sizeof socket->lock_addr,
             "%s%s", socket->addr.sun_path, LOCK_SUFFIX);

    socket->fd_lock = open(socket->lock_addr, O_CREAT | O_CLOEXEC,
                           (S_IRUSR | S_IWUSR | S_IRGRP | S_IWGRP));

    if (socket->fd_lock < 0) {
        printf("unable to open lockfile %s check permissions\n",
               socket->lock_addr);
        goto err;
    }

    if (flock(socket->fd_lock, LOCK_EX | LOCK_NB) < 0) {
        printf("unable to lock lockfile %s, maybe another compositor is running\n",
               socket->lock_addr);
        goto err_fd;
    }

    if (stat(socket->addr.sun_path, &socket_stat) < 0) {
        if (errno != ENOENT) {
            printf("did not manage to stat file %s\n",
                   socket->addr.sun_path);
            goto err_fd;
        }
    } else if (socket_stat.st_mode & S_IWUSR ||
               socket_stat.st_mode & S_IWGRP) {
        unlink(socket->addr.sun_path);
    }

    return 0;
    err_fd:
    close(socket->fd_lock);
    socket->fd_lock = -1;
    err:
    *socket->lock_addr = 0;
    /* we did not set this value here, but without lock the
     * socket won't be created anyway. This prevents the
     * wl_socket_destroy from unlinking already existing socket
     * created by other compositor */
    *socket->addr.sun_path = 0;

    return -1;
}

static int
wl_socket_init_for_display_name(struct wl_socket *s, const char *name) {
    int name_size;
    const char *runtime_dir;

    runtime_dir = getenv("XDG_RUNTIME_DIR");
    if (!runtime_dir) {
        printf("error: XDG_RUNTIME_DIR not set in the environment\n");

        /* to prevent programs reporting
         * "failed to add socket: Success" */
        errno = ENOENT;
        return -1;
    }

    s->addr.sun_family = AF_LOCAL;
    name_size = snprintf(s->addr.sun_path, sizeof s->addr.sun_path,
                         "%s/%s", runtime_dir, name) + 1;

    s->display_name = (s->addr.sun_path + name_size - 1) - strlen(name);

    assert(name_size > 0);
    if (name_size > (int) sizeof s->addr.sun_path) {
        printf("error: socket path \"%s/%s\" plus null terminator"
               " exceeds 108 bytes\n", runtime_dir, name);
        *s->addr.sun_path = 0;
        /* to prevent programs reporting
         * "failed to add socket: Success" */
        errno = ENAMETOOLONG;
        return -1;
    }

    return 0;
}

static int
_wl_display_add_socket(struct wl_display *display, struct wl_socket *s) {
    socklen_t size;

    s->fd = wl_os_socket_cloexec(PF_LOCAL, SOCK_STREAM, 0);
    if (s->fd < 0) {
        return -1;
    }

    size = offsetof (struct sockaddr_un, sun_path) + strlen(s->addr.sun_path);
    if (bind(s->fd, (struct sockaddr *) &s->addr, size) < 0) {
        printf("bind() failed with error: %m\n");
        return -1;
    }

    if (listen(s->fd, 128) < 0) {
        printf("listen() failed with error: %m\n");
        return -1;
    }

    s->source = wl_event_loop_add_fd(display->loop, s->fd,
                                     WL_EVENT_READABLE,
                                     socket_data, display);
    if (s->source == NULL) {
        return -1;
    }

    wl_list_insert(display->socket_list.prev, &s->link);
    return 0;
}

WL_EXPORT const char *
wl_display_add_socket_auto(struct wl_display *display) {
    struct wl_socket *s;
    int displayno = 0;
    char display_name[16] = "";

    /* A reasonable number of maximum default sockets. If
     * you need more than this, use the explicit add_socket API. */
    const int MAX_DISPLAYNO = 32;

    s = wl_socket_alloc();
    if (s == NULL)
        return NULL;

    do {
        snprintf(display_name, sizeof display_name, "wayland-%d", displayno);
        if (wl_socket_init_for_display_name(s, display_name) < 0) {
            wl_socket_destroy(s);
            return NULL;
        }

        if (wl_socket_lock(s) < 0)
            continue;

        if (_wl_display_add_socket(display, s) < 0) {
            wl_socket_destroy(s);
            return NULL;
        }

        return s->display_name;
    } while (displayno++ < MAX_DISPLAYNO);

    /* Ran out of display names. */
    wl_socket_destroy(s);
    errno = EINVAL;
    return NULL;
}

/**  Add a socket with an existing fd to Wayland display for the clients to connect.
 *
 * \param display Wayland display to which the socket should be added.
 * \param sock_fd The existing socket file descriptor to be used
 * \return 0 if success. -1 if failed.
 *
 * The existing socket fd must already be created, opened, and locked.
 * The fd must be properly set to CLOEXEC and bound to a socket file
 * with both bind() and listen() already called.
 *
 * \memberof wl_display
 */
WL_EXPORT int
wl_display_add_socket_fd(struct wl_display *display, int sock_fd) {
    struct wl_socket *s;
    struct stat buf;

    /* Require a valid fd or fail */
    if (sock_fd < 0 || fstat(sock_fd, &buf) < 0 || !S_ISSOCK(buf.st_mode)) {
        return -1;
    }

    s = wl_socket_alloc();
    if (s == NULL)
        return -1;

    s->source = wl_event_loop_add_fd(display->loop, sock_fd,
                                     WL_EVENT_READABLE,
                                     socket_data, display);
    if (s->source == NULL) {
        printf("failed to establish event source\n");
        wl_socket_destroy(s);
        return -1;
    }

    /* Reuse the existing fd */
    s->fd = sock_fd;

    wl_list_insert(display->socket_list.prev, &s->link);

    return 0;
}

/** Add a socket to Wayland display for the clients to connect.
 *
 * \param display Wayland display to which the socket should be added.
 * \param name Name of the Unix socket.
 * \return 0 if success. -1 if failed.
 *
 * This adds a Unix socket to Wayland display which can be used by clients to
 * connect to Wayland display.
 *
 * If NULL is passed as name, then it would look for WAYLAND_DISPLAY env
 * variable for the socket name. If WAYLAND_DISPLAY is not set, then default
 * wayland-0 is used.
 *
 * The Unix socket will be created in the directory pointed to by environment
 * variable XDG_RUNTIME_DIR. If XDG_RUNTIME_DIR is not set, then this function
 * fails and returns -1.
 *
 * The length of socket path, i.e., the path set in XDG_RUNTIME_DIR and the
 * socket name, must not exceed the maximum length of a Unix socket path.
 * The function also fails if the user do not have write permission in the
 * XDG_RUNTIME_DIR path or if the socket name is already in use.
 *
 * \memberof wl_display
 */
WL_EXPORT int
wl_display_add_socket(struct wl_display *display, const char *name) {
    struct wl_socket *s;

    s = wl_socket_alloc();
    if (s == NULL)
        return -1;

    if (name == NULL)
        name = getenv("WAYLAND_DISPLAY");
    if (name == NULL)
        name = "wayland-0";

    if (wl_socket_init_for_display_name(s, name) < 0) {
        wl_socket_destroy(s);
        return -1;
    }

    if (wl_socket_lock(s) < 0) {
        wl_socket_destroy(s);
        return -1;
    }

    if (_wl_display_add_socket(display, s) < 0) {
        wl_socket_destroy(s);
        return -1;
    }

    return 0;
}

WL_EXPORT void
wl_display_add_destroy_listener(struct wl_display *display,
                                struct wl_listener *listener) {
    wl_priv_signal_add(&display->destroy_signal, listener);
}

/** Registers a listener for the client connection signal.
 *  When a new client object is created, \a listener will be notified, carrying
 *  a pointer to the new wl_client object.
 *
 *  \ref wl_client_create
 *  \ref wl_display
 *  \ref wl_listener
 *
 * \param display The display object
 * \param listener Signal handler object
 */
WL_EXPORT void
wl_display_add_client_created_listener(struct wl_display *display,
                                       struct wl_listener *listener) {
    wl_priv_signal_add(&display->create_client_signal, listener);
}

/** Get the list of currently connected clients
 *
 * \param display The display object
 *
 * This function returns a pointer to the list of clients currently
 * connected to the display. You can iterate on the list by using
 * the \a wl_client_for_each macro.
 * The returned value is valid for the lifetime of the \a display.
 * You must not modify the returned list, but only access it.
 *
 * \sa wl_client_for_each()
 * \sa wl_client_get_link()
 * \sa wl_client_from_link()
 *
 * \memberof wl_display
 */
WL_EXPORT struct wl_list *
wl_display_get_client_list(struct wl_display *display) {
    return &display->client_list;
}

/** Get the link by which a client is inserted in the client list
 *
 * \param client The client object
 *
 * \sa wl_client_for_each()
 * \sa wl_display_get_client_list()
 * \sa wl_client_from_link()
 *
 * \memberof wl_client
 */
WL_EXPORT struct wl_list *
wl_client_get_link(struct wl_client *client) {
    return &client->link;
}

/** Get a wl_client by its link
 *
 * \param link The link of a wl_client
 *
 * \sa wl_client_for_each()
 * \sa wl_display_get_client_list()
 * \sa wl_client_get_link()
 *
 * \memberof wl_client
 */
WL_EXPORT struct wl_client *
wl_client_from_link(struct wl_list *link) {
    return container_of(link, struct wl_client, link);
}

/** \cond INTERNAL */

/** Initialize a wl_priv_signal object
 *
 * wl_priv_signal is a safer implementation of a signal type, with the same API
 * as wl_signal, but kept as a private utility of libwayland-server.
 * It is safer because listeners can be removed from within wl_priv_signal_emit()
 * without corrupting the signal's list.
 *
 * Before passing a wl_priv_signal object to any other function it must be
 * initialized by useing wl_priv_signal_init().
 *
 * \memberof wl_priv_signal
 */
void
wl_priv_signal_init(struct wl_priv_signal *signal) {
    wl_list_init(&signal->listener_list);
    wl_list_init(&signal->emit_list);
}

/** Add a listener to a signal
 *
 * The new listener will be called when calling wl_signal_emit(). If a listener is
 * added to the signal while wl_signal_emit() is running it will be called from
 * the next time wl_priv_signal_emit() is called.
 * To remove a listener call wl_list_remove() on its link member.
 *
 * \memberof wl_priv_signal
 */
void
wl_priv_signal_add(struct wl_priv_signal *signal, struct wl_listener *listener) {
    wl_list_insert(signal->listener_list.prev, &listener->link);
}

/** Get a listener added to a signal
 *
 * Returns the listener added to the given \a signal and with the given
 * \a notify function, or NULL if there isn't any.
 * Calling this function from withing wl_priv_signal_emit() is safe and will
 * return the correct value.
 *
 * \memberof wl_priv_signal
 */
struct wl_listener *
wl_priv_signal_get(struct wl_priv_signal *signal, wl_notify_func_t notify) {
    struct wl_listener *l;

    wl_list_for_each(l, &signal->listener_list, link) if (l->notify == notify)
            return l;
    wl_list_for_each(l, &signal->emit_list, link) if (l->notify == notify)
            return l;

    return NULL;
}

/** Emit the signal, calling all the installed listeners
 *
 * Iterate over all the listeners added to this \a signal and call
 * their \a notify function pointer, passing on the given \a data.
 * Removing or adding a listener from within wl_priv_signal_emit()
 * is safe.
 */
void
wl_priv_signal_emit(struct wl_priv_signal *signal, void *data) {
    struct wl_listener *l;
    struct wl_list *pos;

    wl_list_insert_list(&signal->emit_list, &signal->listener_list);
    wl_list_init(&signal->listener_list);

    /* Take every element out of the list and put them in a temporary list.
     * This way, the 'it' func can remove any element it wants from the list
     * without troubles, because we always get the first element, not the
     * one after the current, which may be invalid.
     * wl_list_for_each_safe tries to be safe but it fails: it works fine
     * if the current item is removed, but not if the next one is. */
    while (!wl_list_empty(&signal->emit_list)) {
        pos = signal->emit_list.next;
        l = wl_container_of(pos, l, link);

        wl_list_remove(pos);
        wl_list_insert(&signal->listener_list, pos);

        l->notify(l, data);
    }
}

/** Emit the signal for the last time, calling all the installed listeners
 *
 * Iterate over all the listeners added to this \a signal and call
 * their \a notify function pointer, passing on the given \a data.
 * Removing or adding a listener from within wl_priv_signal_emit()
 * is safe, as is freeing the structure containing the listener.
 *
 * A large body of external code assumes it's ok to free a destruction
 * listener without removing that listener from the list.  Mixing code
 * that acts like this and code that doesn't will result in list
 * corruption.
 *
 * We resolve this by removing each item from the list and isolating it
 * in another list.  We discard it completely after firing the notifier.
 * This should allow interoperability between code that unlinks its
 * destruction listeners and code that just frees structures they're in.
 *
 */
void
wl_priv_signal_final_emit(struct wl_priv_signal *signal, void *data) {
    struct wl_listener *l;
    struct wl_list *pos;

    /* During a destructor notifier isolate every list item before
     * notifying.  This renders harmless the long standing misuse
     * of freeing listeners without removing them, but allows
     * callers that do choose to remove them to interoperate with
     * ones that don't. */
    while (!wl_list_empty(&signal->listener_list)) {
        pos = signal->listener_list.next;
        l = wl_container_of(pos, l, link);

        wl_list_remove(pos);
        wl_list_init(pos);

        l->notify(l, data);
    }
}

/** \endcond INTERNAL */