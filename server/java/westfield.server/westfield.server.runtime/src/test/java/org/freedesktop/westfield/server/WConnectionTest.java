package org.freedesktop.westfield.server;


import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.internal.util.reflection.Whitebox;
import org.mockito.runners.MockitoJUnitRunner;

import javax.websocket.CloseReason;
import javax.websocket.Session;
import java.util.HashMap;
import java.util.Map;

import static com.google.common.truth.Truth.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class WConnectionTest {

    @InjectMocks
    private WConnection wConnection;

    @Test
    public void onOpen() throws Exception {
        //given
        final Session session = mock(Session.class);
        when(session.getNegotiatedSubprotocol()).thenReturn("westfield");

        final WRegistry         wRegistry         = mock(WRegistry.class);
        final WRegistryResource wRegistryResource = mock(WRegistryResource.class);
        when(wRegistry.createResource(any(WClient.class))).thenReturn(wRegistryResource);
        Whitebox.setInternalState(this.wConnection,
                                  "registry",
                                  wRegistry);

        //when
        this.wConnection.onOpen(session);

        //then
        assertThat(this.wConnection.getClients()).hasSize(1);
        verify(wRegistry).publishGlobals(wRegistryResource);
    }

    @Test
    public void onOpenBadSubprotocol() throws Exception {
        //given
        final Session session = mock(Session.class);
        when(session.getNegotiatedSubprotocol()).thenReturn("testfield");

        //when
        this.wConnection.onOpen(session);

        //then
        final ArgumentCaptor<CloseReason> reasonArgumentCaptor = ArgumentCaptor.forClass(CloseReason.class);
        verify(session).close(reasonArgumentCaptor.capture());

        assertThat(reasonArgumentCaptor.getValue()
                                       .getCloseCode()).isEqualTo(CloseReason.CloseCodes.PROTOCOL_ERROR);
    }

    @Test
    public void onError() throws Exception {
        //given
        final Session               session = mock(Session.class);
        final WClient               wClient = mock(WClient.class);
        final Map<Session, WClient> clients = new HashMap<>();
        clients.put(session,
                    wClient);
        Whitebox.setInternalState(this.wConnection,
                                  "wClients",
                                  clients);

        final Throwable t = mock(Throwable.class);

        //when
        this.wConnection.onError(t,
                                 session);

        //then
        verify(wClient).on(t);
    }

    @Test
    public void onClose() throws Exception {
        //given
        final Session               session = mock(Session.class);
        final WClient               wClient = mock(WClient.class);
        final Map<Session, WClient> clients = new HashMap<>();
        clients.put(session,
                    wClient);
        Whitebox.setInternalState(this.wConnection,
                                  "wClients",
                                  clients);

        //when
        this.wConnection.onClose(session);

        //then
        assertThat(this.wConnection.getClients()).isEmpty();
        verify(wClient).onClose();
    }
}