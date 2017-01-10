package org.freedesktop.westfield.server;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;

import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@RunWith(MockitoJUnitRunner.class)
public class WResourceTest {

    @Mock
    private Client              wClient;
    @Mock
    private DummyImplementation dummyImplementation;

    @Test
    public void dispatch() throws Exception {
        //given
        final DummyWResource dummyWResource = new DummyWResource(this.wClient,
                                                                 1,
                                                                 123,
                                                                 this.dummyImplementation);

        final ByteBuffer                message = mock(ByteBuffer.class);
        final Map<Integer, Resource<?>> objects = new HashMap<>();

        //when
        dummyWResource.requests[1].request(message,
                                           objects);
        dummyWResource.requests[1].request(message,
                                           objects);
        dummyWResource.requests[2].request(message,
                                           objects);
        dummyWResource.requests[1].request(message,
                                           objects);
        dummyWResource.requests[2].request(message,
                                           objects);
        //then
        verify(this.dummyImplementation,
               times(3)).foo();
        verify(this.dummyImplementation,
               times(2)).bar();
    }

}