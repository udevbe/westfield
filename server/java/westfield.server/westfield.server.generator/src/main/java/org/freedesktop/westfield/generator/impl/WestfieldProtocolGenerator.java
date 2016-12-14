package org.freedesktop.westfield.generator.impl;

import com.google.auto.common.BasicAnnotationProcessor;
import com.google.auto.service.AutoService;

import javax.annotation.processing.Processor;
import javax.annotation.processing.SupportedAnnotationTypes;

@AutoService(Processor.class)
@SupportedAnnotationTypes({"org.freedesktop.westfield.generator.api.Protocols"})
public class WestfieldProtocolGenerator extends BasicAnnotationProcessor {
    protected Iterable<? extends ProcessingStep> initSteps() {
        //TODO
        return null;
    }
}
