package org.freedesktop.westfield.server;


import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.internal.util.reflection.Whitebox;
import org.mockito.runners.MockitoJUnitRunner;

import static com.google.common.truth.Truth.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class WServerTest {

    @InjectMocks
    private Server wServer;

    @Test
    public void create() throws Exception {
        //given
        final Registry         registry         = mock(Registry.class);
        final RegistryResource registryResource = mock(RegistryResource.class);
        when(registry.createResource(any(Client.class))).thenReturn(registryResource);
        Whitebox.setInternalState(this.wServer,
                                  "registry",
                                  registry);
        final Sender wSender = mock(Sender.class);

        //when
        this.wServer.create(wSender);

        //then
        assertThat(this.wServer.getClients()).hasSize(1);
    }
}