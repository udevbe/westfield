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

#ifndef WAYLAND_SERVER_CORE_H
#define WAYLAND_SERVER_CORE_H

#include <sys/types.h>
#include <stdint.h>
#include <stdbool.h>
#include "wayland-util.h"
#include "wayland-version.h"

#ifdef  __cplusplus
extern "C" {
#endif

enum {
	WL_EVENT_READABLE = 0x01,
	WL_EVENT_WRITABLE = 0x02,
	WL_EVENT_HANGUP   = 0x04,
	WL_EVENT_ERROR    = 0x08
};

typedef int (*wl_connection_wire_message_t)(int client_fd, int32_t * wire_message, size_t wire_message_length, int* fds_in, size_t fds_in_count);

/** File descriptor dispatch function type
 *
 * Functions of this type are used as callbacks for file descriptor events.
 *
 * \param fd The file descriptor delivering the event.
 * \param mask Describes the kind of the event as a bitwise-or of:
 * \c WL_EVENT_READABLE, \c WL_EVENT_WRITABLE, \c WL_EVENT_HANGUP,
 * \c WL_EVENT_ERROR.
 * \param data The user data argument of the related wl_event_loop_add_fd()
 * call.
 * \return If the event source is registered for re-check with
 * wl_event_source_check(): 0 for all done, 1 for needing a re-check.
 * If not registered, the return value is ignored and should be zero.
 *
 * \sa wl_event_loop_add_fd()
 * \memberof wl_event_source
 */
typedef int (*wl_event_loop_fd_func_t)(int fd, uint32_t mask, void *data);

/** Idle task function type
 *
 * Functions of this type are used as callbacks before blocking in
 * wl_event_loop_dispatch().
 *
 * \param data The user data argument of the related wl_event_loop_add_idle()
 * call.
 *
 * \sa wl_event_loop_add_idle() wl_event_loop_dispatch()
 * \memberof wl_event_source
 */
typedef void (*wl_event_loop_idle_func_t)(void *data);

/** \struct wl_event_loop
 *
 * \brief An event loop context
 *
 * Usually you create an event loop context, add sources to it, and call
 * wl_event_loop_dispatch() in a loop to process events.
 *
 * \sa wl_event_source
 */

/** \struct wl_event_source
 *
 * \brief An abstract event source
 *
 * This is the generic type for fd, timer, signal, and idle sources.
 * Functions that operate on specific source types must not be used with
 * a different type, even if the function signature allows it.
 */

struct wl_event_loop *
wl_event_loop_create(void);

void
wl_event_loop_destroy(struct wl_event_loop *loop);

struct wl_event_source *
wl_event_loop_add_fd(struct wl_event_loop *loop,
		     int fd, uint32_t mask,
		     wl_event_loop_fd_func_t func,
		     void *data);

int
wl_event_source_fd_update(struct wl_event_source *source, uint32_t mask);

int
wl_event_source_remove(struct wl_event_source *source);

int
wl_event_loop_dispatch(struct wl_event_loop *loop, int timeout);

void
wl_event_loop_dispatch_idle(struct wl_event_loop *loop);

struct wl_listener;

typedef void (*wl_notify_func_t)(struct wl_listener *listener, void *data);

struct wl_display *
wl_display_create(void);

void
wl_display_destroy(struct wl_display *display);

int
wl_display_add_socket(struct wl_display *display, const char *name);

const char *
wl_display_add_socket_auto(struct wl_display *display);

int
wl_display_add_socket_fd(struct wl_display *display, int sock_fd);

void
wl_display_terminate(struct wl_display *display);

void
wl_display_run(struct wl_display *display);

void
wl_display_flush_clients(struct wl_display *display);

void
wl_display_destroy_clients(struct wl_display *display);

struct wl_client;

void
wl_display_add_client_created_listener(struct wl_display *display,
					struct wl_listener *listener);

struct wl_client *
wl_client_create(struct wl_display *display, int fd);

void
wl_client_set_wire_message_cb(struct wl_client* client, wl_connection_wire_message_t wire_message_cb);

struct wl_list *
wl_display_get_client_list(struct wl_display *display);

struct wl_list *
wl_client_get_link(struct wl_client *client);

struct wl_client *
wl_client_from_link(struct wl_list *link);

/** Iterate over a list of clients. */
#define wl_client_for_each(client, list)				\
	for (client = wl_client_from_link((list)->next);	\
	     wl_client_get_link(client) != (list);			\
	     client = wl_client_from_link(wl_client_get_link(client)->next))

void
wl_client_destroy(struct wl_client *client);

void
wl_client_flush(struct wl_client *client);

void
wl_client_get_credentials(struct wl_client *client,
			  pid_t *pid, uid_t *uid, gid_t *gid);

int
wl_client_get_fd(struct wl_client *client);

void
wl_client_add_destroy_listener(struct wl_client *client,
			       struct wl_listener *listener);

struct wl_listener *
wl_client_get_destroy_listener(struct wl_client *client,
			       wl_notify_func_t notify);

void
wl_client_post_no_memory(struct wl_client *client);

/** \class wl_listener
 *
 * \brief A single listener for Wayland signals
 *
 * wl_listener provides the means to listen for wl_signal notifications. Many
 * Wayland objects use wl_listener for notification of significant events like
 * object destruction.
 *
 * Clients should create wl_listener objects manually and can register them as
 * listeners to signals using #wl_signal_add, assuming the signal is
 * directly accessible. For opaque structs like wl_event_loop, adding a
 * listener should be done through provided accessor methods. A listener can
 * only listen to one signal at a time.
 *
 * \code
 * struct wl_listener your_listener;
 *
 * your_listener.notify = your_callback_method;
 *
 * // Direct access
 * wl_signal_add(&some_object->destroy_signal, &your_listener);
 *
 * // Accessor access
 * wl_event_loop *loop = ...;
 * wl_event_loop_add_destroy_listener(loop, &your_listener);
 * \endcode
 *
 * If the listener is part of a larger struct, #wl_container_of can be used
 * to retrieve a pointer to it:
 *
 * \code
 * void your_listener(struct wl_listener *listener, void *data)
 * {
 * 	struct your_data *data;
 *
 * 	your_data = wl_container_of(listener, data, your_member_name);
 * }
 * \endcode
 *
 * If you need to remove a listener from a signal, use wl_list_remove().
 *
 * \code
 * wl_list_remove(&your_listener.link);
 * \endcode
 *
 * \sa wl_signal
 */
struct wl_listener {
	struct wl_list link;
	wl_notify_func_t notify;
};

/** \class wl_signal
 *
 * \brief A source of a type of observable event
 *
 * Signals are recognized points where significant events can be observed.
 * Compositors as well as the server can provide signals. Observers are
 * wl_listener's that are added through #wl_signal_add. Signals are emitted
 * using #wl_signal_emit, which will invoke all listeners until that
 * listener is removed by wl_list_remove() (or whenever the signal is
 * destroyed).
 *
 * \sa wl_listener for more information on using wl_signal
 */
struct wl_signal {
	struct wl_list listener_list;
};

/** Initialize a new \ref wl_signal for use.
 *
 * \param signal The signal that will be initialized
 *
 * \memberof wl_signal
 */
static inline void
wl_signal_init(struct wl_signal *signal)
{
	wl_list_init(&signal->listener_list);
}

/** Emits this signal, notifying all registered listeners.
 *
 * \param signal The signal object that will emit the signal
 * \param data The data that will be emitted with the signal
 *
 * \memberof wl_signal
 */
static inline void
wl_signal_emit(struct wl_signal *signal, void *data)
{
	struct wl_listener *l, *next;

	wl_list_for_each_safe(l, next, &signal->listener_list, link)
		l->notify(l, data);
}

#ifdef  __cplusplus
}
#endif

#endif
