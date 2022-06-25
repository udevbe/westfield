#include <unistd.h>
#include "westfield-dmabuf.h"

void
dmabuf_attributes_finish(struct dmabuf_attributes *attribs) {
    for (int i = 0; i < attribs->n_planes; ++i) {
        close(attribs->fd[i]);
        attribs->fd[i] = -1;
    }
    attribs->n_planes = 0;
}
