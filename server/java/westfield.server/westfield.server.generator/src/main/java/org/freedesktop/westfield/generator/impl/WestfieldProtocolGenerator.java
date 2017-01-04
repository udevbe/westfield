package org.freedesktop.westfield.generator.impl;

import com.google.auto.common.BasicAnnotationProcessor;
import com.google.auto.service.AutoService;

import javax.annotation.processing.Processor;
import javax.annotation.processing.SupportedAnnotationTypes;
import java.util.Collections;

@AutoService(Processor.class)
@SupportedAnnotationTypes({"org.freedesktop.westfield.generator.api.Protocols"})
public class WestfieldProtocolGenerator extends BasicAnnotationProcessor {
    protected Iterable<? extends ProcessingStep> initSteps() {
        //TODO
        return Collections.singleton(new ProtocolsProcessingStep(processingEnv));
    }
}
