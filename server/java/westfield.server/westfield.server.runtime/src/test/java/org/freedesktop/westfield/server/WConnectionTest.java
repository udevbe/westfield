package org.freedesktop.westfield.server;


import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.internal.util.reflection.Whitebox;
import org.mockito.runners.MockitoJUnitRunner;

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
        final WRegistry         wRegistry         = mock(WRegistry.class);
        final WRegistryResource wRegistryResource = mock(WRegistryResource.class);
        when(wRegistry.createResource(any(WClient.class))).thenReturn(wRegistryResource);
        Whitebox.setInternalState(this.wConnection,
                                  "registry",
                                  wRegistry);
        WSender wSender = mock(WSender.class);

        //when
        this.wConnection.create(wSender);

        //then
        assertThat(this.wConnection.getClients()).hasSize(1);
        verify(wRegistry).publishGlobals(wRegistryResource);
    }
}