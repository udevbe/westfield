package org.freedesktop.westfield.generator.impl;

import com.google.auto.common.BasicAnnotationProcessor;
import com.google.common.base.CaseFormat;
import com.google.common.collect.SetMultimap;
import com.squareup.javapoet.ClassName;
import com.squareup.javapoet.CodeBlock;
import com.squareup.javapoet.JavaFile;
import com.squareup.javapoet.MethodSpec;
import com.squareup.javapoet.ParameterSpec;
import com.squareup.javapoet.ParameterizedTypeName;
import com.squareup.javapoet.TypeName;
import com.squareup.javapoet.TypeSpec;
import com.squareup.javapoet.WildcardTypeName;
import org.freedesktop.westfield.generator.api.Protocols;
import org.freedesktop.westfield.server.WArgsReader;
import org.freedesktop.westfield.server.WClient;
import org.freedesktop.westfield.server.WResource;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.AnnotationValue;
import javax.lang.model.element.Element;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.PackageElement;
import javax.lang.model.util.SimpleAnnotationValueVisitor8;
import javax.lang.model.util.SimpleElementVisitor8;
import javax.tools.Diagnostic;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.File;
import java.io.IOException;
import java.lang.annotation.Annotation;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ProtocolsProcessingStep implements BasicAnnotationProcessor.ProcessingStep {

    private static class PackageElementQualifiedNameVisitor extends SimpleElementVisitor8<String, Void> {
        @Override
        protected String defaultAction(final Element e,
                                       final Void aVoid) {
            throw new AssertionError();
        }

        @Override
        public String visitPackage(final PackageElement e,
                                   final Void aVoid) {
            return e.getQualifiedName()
                    .toString();
        }
    }

    private static class ProtocolsValueVisitor extends SimpleAnnotationValueVisitor8<List<? extends AnnotationValue>, Void> {
        @Override
        protected List<? extends AnnotationValue> defaultAction(final Object o,
                                                                final Void aVoid) {
            throw new AssertionError();
        }

        @Override
        public List<? extends AnnotationValue> visitArray(final List<? extends AnnotationValue> vals,
                                                          final Void aVoid) {
            return vals;
        }
    }

    private static class ProtocolValueVisitor extends SimpleAnnotationValueVisitor8<String, Void> {
        @Override
        protected String defaultAction(final Object o,
                                       final Void aVoid) {
            throw new AssertionError();
        }

        @Override
        public String visitString(final String s,
                                  final Void aVoid) {
            return s;
        }
    }

    private final ProcessingEnvironment processingEnv;

    ProtocolsProcessingStep(final ProcessingEnvironment processingEnv) {
        this.processingEnv = processingEnv;
    }


    @Override
    public Set<? extends Class<? extends Annotation>> annotations() {
        return Collections.singleton(Protocols.class);
    }

    @Override
    public Set<Element> process(final SetMultimap<Class<? extends Annotation>, Element> elementsByAnnotation) {
        elementsByAnnotation.get(Protocols.class)
                            .forEach(element -> {
                                element.getAnnotationMirrors()
                                       .forEach(annotationMirror -> {
                                           annotationMirror.getElementValues()
                                                           .forEach((executableElement, protocolsAnnotationValue) -> {
                                                               if (executableElement.getSimpleName()
                                                                                    .contentEquals("value")) {
                                                                   protocolsAnnotationValue.accept(new ProtocolsValueVisitor(),
                                                                                                   null)
                                                                                           .forEach(protocolAnnotationValue -> {
                                                                                               final String protocolXmlFile = protocolAnnotationValue.accept(new ProtocolValueVisitor(),
                                                                                                                                                             null);
                                                                                               processProtocolXmlFile(protocolXmlFile,
                                                                                                                      element);
                                                                                           });
                                                               }
                                                           });
                                       });
                            });
        return Collections.emptySet();
    }

    private void processProtocolXmlFile(final String protocolXmlFile,
                                        final Element element) {
        try {
            final File                   xmlFile  = new File(protocolXmlFile);
            final DocumentBuilderFactory factory  = DocumentBuilderFactory.newInstance();
            final DocumentBuilder        builder  = factory.newDocumentBuilder();
            final Document               document = builder.parse(xmlFile);
            document.normalize();

            final org.w3c.dom.Element documentElement = document.getDocumentElement();

            final String name    = documentElement.getAttribute("name");
            final String version = documentElement.getAttribute("version");

            this.processingEnv.getMessager()
                              .printMessage(Diagnostic.Kind.NOTE,
                                            String.format("Processing %s version %s using file %s",
                                                          name,
                                                          version,
                                                          protocolXmlFile),
                                            element);

            final NodeList interfaceElements = documentElement.getElementsByTagName("interface");
            for (int i = 0; i < interfaceElements.getLength(); i++) {
                final org.w3c.dom.Element interfaceElement = (org.w3c.dom.Element) interfaceElements.item(i);
                createRequestsInterface(interfaceElement,
                                        element);
                createResource(interfaceElement,
                               element);
            }

        }
        catch (ParserConfigurationException | IOException | SAXException e) {
            this.processingEnv.getMessager()
                              .printMessage(Diagnostic.Kind.ERROR,
                                            "Failed to parse protocol xml file. " + e.getMessage(),
                                            element);
            e.printStackTrace();
        }
    }

    private MethodSpec createResourceConstructor(final org.w3c.dom.Element interfaceElement,
                                                 final String packageName,
                                                 final String requestsName) {
        final MethodSpec.Builder constructorBuilder = MethodSpec.constructorBuilder();
        final ParameterSpec clientParameterSpec = ParameterSpec.builder(WClient.class,
                                                                        "client",
                                                                        Modifier.PUBLIC,
                                                                        Modifier.FINAL)
                                                               .build();
        final ParameterSpec idParameterSpec = ParameterSpec.builder(int.class,
                                                                    "id",
                                                                    Modifier.PUBLIC,
                                                                    Modifier.FINAL)
                                                           .build();
        final ParameterSpec implementationParameterSpec = ParameterSpec.builder(ClassName.get(packageName,
                                                                                              requestsName),
                                                                                "implementation",
                                                                                Modifier.PUBLIC,
                                                                                Modifier.FINAL)
                                                                       .build();
        constructorBuilder.addModifiers(Modifier.PUBLIC)
                          .addParameter(clientParameterSpec)
                          .addParameter(idParameterSpec)
                          .addParameter(implementationParameterSpec)
                          .addCode(CodeBlock.builder()
                                            .addStatement("super($N, $N, $N)",
                                                          clientParameterSpec,
                                                          idParameterSpec,
                                                          implementationParameterSpec)
                                            .build());

        //process request method references
        final CodeBlock.Builder requestsCallbackArray = CodeBlock.builder();
        requestsCallbackArray.add("$[this.requests = new Request[]{null");
        final NodeList requestElements = interfaceElement.getElementsByTagName("request");
        for (int i = 0; i < requestElements.getLength(); i++) {
            requestsCallbackArray.add(", this::%L",
                                      i);
        }
        requestsCallbackArray.add("}$]");

        return constructorBuilder.build();
    }

    private List<MethodSpec> createResourceRequestMethods(final org.w3c.dom.Element interfaceElement,
                                                          final String packageName,
                                                          final String requestsName) {
        final List<MethodSpec> methodSpecs = new LinkedList<>();

        final ParameterSpec messageParameter = ParameterSpec.builder(ByteBuffer.class,
                                                                     "message",
                                                                     Modifier.FINAL)
                                                            .build();
        final ParameterSpec objectsParameter = ParameterSpec.builder(ParameterizedTypeName.get(ClassName.get(Map.class),
                                                                                               TypeName.get(Integer.class),
                                                                                               ParameterizedTypeName.get(ClassName.get(WResource.class),
                                                                                                                         WildcardTypeName.subtypeOf(Object.class))),
                                                                     "message",
                                                                     Modifier.FINAL)
                                                            .build();

        final NodeList requestElements = interfaceElement.getElementsByTagName("request");
        for (int i = 0; i < requestElements.getLength(); i++) {

            org.w3c.dom.Element requestElement   = (org.w3c.dom.Element) requestElements.item(i);
            final String        requestName      = requestElement.getAttribute("name");
            final NodeList      requestArguments = requestElement.getElementsByTagName("arg");

            final MethodSpec.Builder methodBuilder = MethodSpec.methodBuilder(String.format("$%d",
                                                                                            i + 1));
            methodBuilder.addModifiers(Modifier.PRIVATE);
            methodBuilder.addParameter(messageParameter);
            methodBuilder.addParameter(objectsParameter);

            final String wArgsReader = "wArgsReader";
            if (requestArguments.getLength() > 0) {
                methodBuilder.addStatement("final $T $L = new $T($N, $N)",
                                           WArgsReader.class,
                                           wArgsReader,
                                           WArgsReader.class,
                                           messageParameter,
                                           objectsParameter);
            }

            methodBuilder.addCode("$[getImplementation().$L(this",
                                  requestName);
            for (int j = 0; j < requestArguments.getLength(); j++) {
                org.w3c.dom.Element requestArgument = (org.w3c.dom.Element) requestArguments.item(j);
                final String        argumentType    = requestArgument.getAttribute("type");

                final String readArgument;
                switch (argumentType) {
                    case "uint":
                    case "int":
                        readArgument = "readInt";
                        break;
                    case "fixed":
                        readArgument = "readFixed";
                        break;
                    case "object":
                        readArgument = "readObject";
                        break;
                    case "new_id":
                        readArgument = "readNewObject";
                        break;
                    case "string":
                        readArgument = "readString";
                        break;
                    case "array":
                        readArgument = "readArray";
                        break;
                    default:
                        throw new AssertionError();
                }
                methodBuilder.addCode(", $L.$L()",
                                      wArgsReader,
                                      readArgument);
            }
            methodBuilder.addCode("$]");

            methodSpecs.add(methodBuilder.build());
        }

        return methodSpecs;
    }

    private void createResource(final org.w3c.dom.Element interfaceElement,
                                final Element packageElement) throws IOException {
        final String name    = interfaceElement.getAttribute("name");
        final String version = interfaceElement.getAttribute("version");

        final String packageName = packageElement.accept(new PackageElementQualifiedNameVisitor(),
                                                         null);
        final String resourceName = resourceName(name);
        final String requestsName = requestsName(name,
                                                 version);

        //resource type
        final TypeSpec.Builder resourceBuilder = TypeSpec.classBuilder(resourceName);
        final TypeName superTypeName = ParameterizedTypeName.get(ClassName.get(WResource.class),
                                                                 ClassName.get(packageName,
                                                                               requestsName));
        resourceBuilder.superclass(superTypeName);

        //constructor
        resourceBuilder.addMethod(createResourceConstructor(interfaceElement,
                                                            packageName,
                                                            requestsName));

        //request methods
        createResourceRequestMethods(interfaceElement,
                                     packageName,
                                     requestsName).forEach(resourceBuilder::addMethod);

        //event methods
        createResourceEventMethods(interfaceElement,
                                   packageElement,
                                   requestsName).forEach(resourceBuilder::addMethod);

        final JavaFile javaFile = JavaFile.builder(packageName,
                                                   resourceBuilder.build())
                                          .build();
        javaFile.writeTo(this.processingEnv.getFiler());
    }

    private List<MethodSpec> createResourceEventMethods(final org.w3c.dom.Element interfaceElement,
                                                        final Element packageElement,
                                                        final String requestsName) {
        final List<MethodSpec> methodSpecs = new LinkedList<>();

        final NodeList eventElements = interfaceElement.getElementsByTagName("event");
        for (int i = 0; i < eventElements.getLength(); i++) {
            final org.w3c.dom.Element eventElement = (org.w3c.dom.Element) eventElements.item(i);

            final String eventName = eventElement.getAttribute("name");

            final MethodSpec.Builder builder = MethodSpec.methodBuilder(eventName);

            //TODO more

            methodSpecs.add(builder.build());
        }

        return methodSpecs;
    }

    private void createRequestsInterface(final org.w3c.dom.Element interfaceElement,
                                         final Element packageElement) throws IOException {
        final String name    = interfaceElement.getAttribute("name");
        final String version = interfaceElement.getAttribute("version");

        final String requestsName = requestsName(name,
                                                 version);
        final TypeSpec.Builder requestBuilder = TypeSpec.interfaceBuilder(requestsName);


        final JavaFile javaFile = JavaFile.builder(packageElement.accept(new PackageElementQualifiedNameVisitor(),
                                                                         null),
                                                   requestBuilder.build())
                                          .build();
        javaFile.writeTo(this.processingEnv.getFiler());
    }

    private String requestsName(final String name,
                                final String version) {
        return CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL,
                                              String.format("%s_requests_v%s",
                                                            name,
                                                            version));
    }

    private String resourceName(final String name) {
        return CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL,
                                              String.format("%s_resource",
                                                            name));
    }
}
