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
import org.freedesktop.westfield.server.Request;
import org.freedesktop.westfield.server.WArgs;
import org.freedesktop.westfield.server.WArgsReader;
import org.freedesktop.westfield.server.WClient;
import org.freedesktop.westfield.server.WFixed;
import org.freedesktop.westfield.server.WResource;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.AnnotationMirror;
import javax.lang.model.element.AnnotationValue;
import javax.lang.model.element.Element;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.PackageElement;
import javax.lang.model.util.SimpleAnnotationValueVisitor8;
import javax.lang.model.util.SimpleElementVisitor8;
import javax.tools.Diagnostic;
import javax.tools.FileObject;
import javax.tools.StandardLocation;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.File;
import java.io.IOException;
import java.lang.annotation.Annotation;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ProtocolsProcessingStep implements BasicAnnotationProcessor.ProcessingStep {

    private static class PackageElementQualifiedNameVisitor extends SimpleElementVisitor8<String, Void> {
        @Override
        protected String defaultAction(final Element e,
                                       final Void aVoid) {
            throw new AssertionError("Expected a package element, instead got: " + e.toString());
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
            throw new AssertionError("Expected array value, instead got: " + o.toString());
        }

        @Override
        public List<? extends AnnotationValue> visitArray(final List<? extends AnnotationValue> vals,
                                                          final Void aVoid) {
            return vals;
        }
    }

    private static class ProtocolAnnotationVisitor extends SimpleAnnotationValueVisitor8<AnnotationMirror, Void> {
        @Override
        protected AnnotationMirror defaultAction(final Object o,
                                                 final Void aVoid) {
            throw new AssertionError("Expected annotation value, instead got: " + o.toString());
        }

        @Override
        public AnnotationMirror visitAnnotation(final AnnotationMirror a,
                                                final Void aVoid) {
            return a;
        }
    }

    private static class ProtocolValueVisitor extends SimpleAnnotationValueVisitor8<String, Void> {
        @Override
        protected String defaultAction(final Object o,
                                       final Void aVoid) {
            throw new AssertionError("Expected array value, instead got: " + o.toString());
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
        elementsByAnnotation.get(Protocols.class)//get package element
                            .forEach(element -> {
                                element.getAnnotationMirrors()
                                       .forEach(protocolsAnnotationMirror -> {//get package level annotations (@Protocols)
                                           protocolsAnnotationMirror.getElementValues()
                                                                    .forEach((executableElement, protocolsAnnotationValue) -> {
                                                                        if (executableElement.getSimpleName()
                                                                                             .contentEquals("value")) {//get @Protocols.value()
                                                                            protocolsAnnotationValue.accept(new ProtocolsValueVisitor(),
                                                                                                            null)
                                                                                                    .forEach(annotationValue -> {
                                                                                                        final AnnotationMirror protocolAnnotationMirror = annotationValue.accept(new ProtocolAnnotationVisitor(),
                                                                                                                                                                                 null);//get @Protocol
                                                                                                        protocolAnnotationMirror.getElementValues()
                                                                                                                                .forEach((executableElement1, protocolAnnotationValue) -> {
                                                                                                                                    if (executableElement1.getSimpleName()
                                                                                                                                                          .contentEquals("value")) {//get @Protocol.value()
                                                                                                                                        processProtocolXmlFile(protocolAnnotationValue.accept(new ProtocolValueVisitor(),
                                                                                                                                                                                              null),
                                                                                                                                                               element);
                                                                                                                                    }
                                                                                                                                });
                                                                                                    });
                                                                        }
                                                                    });
                                       });
                            });
        return Collections.emptySet();
    }

    private void processProtocolXmlFile(final String protocolXmlFile,
                                        final Element packageElement) {
        try {
            final String packageName = packageElement.accept(new PackageElementQualifiedNameVisitor(),
                                                             null);

            final DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            final DocumentBuilder        builder = factory.newDocumentBuilder();
            final Document               document;
            final File                   xmlFile = new File(protocolXmlFile);
            if (xmlFile.exists()) {
                document = builder.parse(xmlFile);
            }
            else {
                //try source path
                final FileObject resource = this.processingEnv.getFiler()
                                                              .getResource(StandardLocation.SOURCE_PATH,
                                                                           packageName,
                                                                           protocolXmlFile);
                document = builder.parse(resource.openInputStream());
            }

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
                                            packageElement);

            final NodeList copyrightElements = documentElement.getElementsByTagName("copyright");
            final String[] copyrights        = new String[copyrightElements.getLength()];

            for (int i = 0; i < copyrightElements.getLength(); i++) {
                final org.w3c.dom.Element copyrightElement = (org.w3c.dom.Element) copyrightElements.item(i);
                copyrights[i] = copyrightElement.getTextContent();
            }

            final NodeList interfaceElements = documentElement.getElementsByTagName("interface");
            for (int i = 0; i < interfaceElements.getLength(); i++) {
                final org.w3c.dom.Element interfaceElement = (org.w3c.dom.Element) interfaceElements.item(i);
                createRequestsInterface(copyrights,
                                        interfaceElement,
                                        packageName);
                createResource(copyrights,
                               interfaceElement,
                               packageName);
                createEnums(copyrights,
                            interfaceElement,
                            packageName);
            }

        }
        catch (ParserConfigurationException | IOException | SAXException e) {
            this.processingEnv.getMessager()
                              .printMessage(Diagnostic.Kind.ERROR,
                                            "Failed to parse protocol xml file. " + e.getMessage(),
                                            packageElement);
            e.printStackTrace();
        }
    }

    private void addCopyright(final String[] copyrights,
                              final JavaFile.Builder javaFileBuilder) {
        for (final String copyright : copyrights) {
            javaFileBuilder.addFileComment(copyright);
        }
    }

    private void addDescriptions(final NodeList descriptionElements,
                                 final TypeSpec.Builder builder) {
        for (int i = 0; i < descriptionElements.getLength(); i++) {
            final org.w3c.dom.Element descriptionElement = (org.w3c.dom.Element) descriptionElements.item(i);
            builder.addJavadoc("<pre>" + descriptionElement.getTextContent() + "</pre>");
        }
    }

    private void addDescriptions(final NodeList methodDescriptionElements,
                                 final MethodSpec.Builder builder,
                                 final LinkedHashMap<String, String> argumentSummaries) {
        for (int i = 0; i < methodDescriptionElements.getLength(); i++) {
            final org.w3c.dom.Element descriptionElement = (org.w3c.dom.Element) methodDescriptionElements.item(i);
            final StringBuilder stringBuffer = new StringBuilder().append("<pre>")
                                                                  .append(descriptionElement.getTextContent())
                                                                  .append("</pre>\n");
            argumentSummaries.forEach((argName, argSummary) -> {
                stringBuffer.append("\n@param ")
                            .append(argName)
                            .append(' ')
                            .append(argSummary);
            });

            builder.addJavadoc(stringBuffer.toString());
        }
    }

    private void createEnums(final String[] copyrights,
                             final org.w3c.dom.Element interfaceElement,
                             final String packageName) throws IOException {

        final String interfaceName = interfaceElement.getAttribute("name");

        final NodeList interfaceEnums = interfaceElement.getElementsByTagName("enum");
        for (int i = 0; i < interfaceEnums.getLength(); i++) {
            final org.w3c.dom.Element interfaceEnum = (org.w3c.dom.Element) interfaceEnums.item(i);

            final String   enumName            = interfaceEnum.getAttribute("name");
            final NodeList descriptionElements = interfaceEnum.getElementsByTagName("description");

            final TypeSpec.Builder enumBuilder = TypeSpec.enumBuilder(enumNameCamelCase(interfaceName,
                                                                                        enumName));
            enumBuilder.addModifiers(Modifier.PUBLIC);


            addDescriptions(descriptionElements,
                            enumBuilder);

            enumBuilder.addField(TypeName.INT,
                                 "value",
                                 Modifier.PUBLIC,
                                 Modifier.FINAL);
            final MethodSpec.Builder constructorBuilder = MethodSpec.constructorBuilder();
            constructorBuilder.addParameter(TypeName.INT,
                                            "value",
                                            Modifier.FINAL);
            constructorBuilder.addStatement("this.value = value");
            enumBuilder.addMethod(constructorBuilder.build());

            final NodeList enumEntries = interfaceEnum.getElementsByTagName("entry");
            for (int j = 0; j < enumEntries.getLength(); j++) {
                final org.w3c.dom.Element enumEntry = (org.w3c.dom.Element) enumEntries.item(j);

                final String entryName  = normalizeName(enumEntry.getAttribute("name"));
                final String entryValue = enumEntry.getAttribute("value");
                final String summary    = enumEntry.getAttribute("summary");

                enumBuilder.addEnumConstant(entryName,
                                            TypeSpec.anonymousClassBuilder("$L",
                                                                           entryValue)
                                                    .addJavadoc("<pre>" + summary + "</pre>")
                                                    .build());
            }

            final JavaFile.Builder builder = JavaFile.builder(packageName,
                                                              enumBuilder.build());
            addCopyright(copyrights,
                         builder);
            final JavaFile javaFile = builder.build();
            javaFile.writeTo(this.processingEnv.getFiler());
        }
    }

    private MethodSpec createResourceConstructor(final org.w3c.dom.Element interfaceElement,
                                                 final String packageName,
                                                 final String requestsName) {
        final MethodSpec.Builder constructorBuilder = MethodSpec.constructorBuilder();
        final ParameterSpec clientParameterSpec = ParameterSpec.builder(WClient.class,
                                                                        "client",
                                                                        Modifier.FINAL)
                                                               .build();
        final ParameterSpec versionParameterSpec = ParameterSpec.builder(int.class,
                                                                         "version",
                                                                         Modifier.FINAL)
                                                                .build();
        final ParameterSpec idParameterSpec = ParameterSpec.builder(int.class,
                                                                    "id",
                                                                    Modifier.FINAL)
                                                           .build();
        final ParameterSpec implementationParameterSpec = ParameterSpec.builder(ClassName.get(packageName,
                                                                                              requestsName),
                                                                                "implementation",
                                                                                Modifier.FINAL)
                                                                       .build();
        constructorBuilder.addModifiers(Modifier.PUBLIC)
                          .addParameter(clientParameterSpec)
                          .addParameter(versionParameterSpec)
                          .addParameter(idParameterSpec)
                          .addParameter(implementationParameterSpec)
                          .addCode(CodeBlock.builder()
                                            .addStatement("super($N, $N, $N, $N)",
                                                          clientParameterSpec,
                                                          versionParameterSpec,
                                                          idParameterSpec,
                                                          implementationParameterSpec)
                                            .build());

        //process request method references
        final CodeBlock.Builder requestsCallbackArray = CodeBlock.builder();
        requestsCallbackArray.add("$[this.requests = new $T[]{null",
                                  Request.class);
        final NodeList requestElements = interfaceElement.getElementsByTagName("request");
        for (int i = 0; i < requestElements.getLength(); i++) {
            requestsCallbackArray.add(", this::$$$L",
                                      i + 1);
        }
        requestsCallbackArray.add("};\n$]");
        constructorBuilder.addCode(requestsCallbackArray.build());

        return constructorBuilder.build();
    }

    private List<MethodSpec> createResourceRequestMethods(final org.w3c.dom.Element interfaceElement,
                                                          final String packageName,
                                                          final String interfaceName) {
        final List<MethodSpec> methodSpecs = new LinkedList<>();

        final ParameterSpec messageParameter = ParameterSpec.builder(ByteBuffer.class,
                                                                     "message",
                                                                     Modifier.FINAL)
                                                            .build();
        final ParameterSpec objectsParameter = ParameterSpec.builder(ParameterizedTypeName.get(ClassName.get(Map.class),
                                                                                               TypeName.get(Integer.class),
                                                                                               ParameterizedTypeName.get(ClassName.get(WResource.class),
                                                                                                                         WildcardTypeName.subtypeOf(Object.class))),
                                                                     "objects",
                                                                     Modifier.FINAL)
                                                            .build();

        final NodeList requestElements = interfaceElement.getElementsByTagName("request");
        for (int i = 0; i < requestElements.getLength(); i++) {

            final org.w3c.dom.Element requestElement   = (org.w3c.dom.Element) requestElements.item(i);
            final String              requestName      = normalizeName(requestElement.getAttribute("name"));
            final String              since            = requestElement.getAttribute("since");
            final NodeList            requestArguments = requestElement.getElementsByTagName("arg");

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

            methodBuilder.addCode("$[this.<$T>getImplementation().$L(this",
                                  ClassName.get(packageName,
                                                requestsNameCamelCase(interfaceName,
                                                                      since.isEmpty() ? "1" : since)),
                                  requestName);
            for (int j = 0; j < requestArguments.getLength(); j++) {
                final org.w3c.dom.Element requestArgument = (org.w3c.dom.Element) requestArguments.item(j);
                final String              argumentType    = requestArgument.getAttribute("type");

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
                        throw new AssertionError("Encountered unexpected argument type: " + argumentType);
                }
                methodBuilder.addCode(", $L.$L()",
                                      wArgsReader,
                                      readArgument);
            }
            methodBuilder.addCode(");\n$]");

            methodSpecs.add(methodBuilder.build());
        }

        return methodSpecs;
    }

    private void createResource(final String[] copyrights,
                                final org.w3c.dom.Element interfaceElement,
                                final String packageName) throws IOException {
        final String   interfaceName       = interfaceElement.getAttribute("name");
        final NodeList descriptionElements = interfaceElement.getElementsByTagName("description");

        final String resourceName = resourceNameCamelCase(interfaceName);
        final String requestsName = requestsNameCamelCase(interfaceName,
                                                          "1");

        //resource type
        final TypeSpec.Builder resourceBuilder = TypeSpec.classBuilder(resourceName);
        addDescriptions(descriptionElements,
                        resourceBuilder);

        resourceBuilder.addModifiers(Modifier.PUBLIC);
        final TypeName superTypeName = ParameterizedTypeName.get(ClassName.get(WResource.class),
                                                                 ClassName.get(packageName,
                                                                               requestsName));
        resourceBuilder.superclass(superTypeName);

        //constructor
        resourceBuilder.addMethod(createResourceConstructor(interfaceElement,
                                                            packageName,
                                                            requestsName));

        //request callback methods
        createResourceRequestMethods(interfaceElement,
                                     packageName,
                                     interfaceName).forEach(resourceBuilder::addMethod);

        //event methods
        createResourceEventMethods(interfaceElement,
                                   packageName).forEach(resourceBuilder::addMethod);

        final JavaFile.Builder builder = JavaFile.builder(packageName,
                                                          resourceBuilder.build());
        addCopyright(copyrights,
                     builder);
        final JavaFile javaFile = builder.build();
        javaFile.writeTo(this.processingEnv.getFiler());
    }

    private String normalizeName(final String name) {
        final String camelCaseName = CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL,
                                                                    name);

        return SourceVersion.isName(camelCaseName) ? camelCaseName : "_" + camelCaseName;
    }

    private TypeName toJavaTypeName(final org.w3c.dom.Element argumentElement,
                                    final String packageName,
                                    final String argumentType) {
        final TypeName argumentJavaType;
        switch (argumentType) {
            case "uint":
            case "int":
                argumentJavaType = TypeName.INT;
                break;
            case "fixed":
                argumentJavaType = ClassName.get(WFixed.class);
                break;
            case "object":
                final String interfaceName = argumentElement.getAttribute("interface");
                if (interfaceName.isEmpty()) {
                    argumentJavaType = ParameterizedTypeName.get(ClassName.get(WResource.class),
                                                                 WildcardTypeName.subtypeOf(Object.class));
                }
                else {
                    argumentJavaType = ClassName.get(packageName,
                                                     resourceNameCamelCase(interfaceName));
                }
                break;
            case "new_id":
                argumentJavaType = TypeName.INT;
                break;
            case "string":
                argumentJavaType = ClassName.get(String.class);
                break;
            case "array":
                argumentJavaType = ClassName.get(ByteBuffer.class);
                break;
            default:
                throw new AssertionError("Encountered unexpected argument type: " + argumentType);
        }
        return argumentJavaType;
    }

    private List<MethodSpec> createResourceEventMethods(final org.w3c.dom.Element interfaceElement,
                                                        final String packageName) {
        final List<MethodSpec> methodSpecs = new LinkedList<>();

        final NodeList eventElements = interfaceElement.getElementsByTagName("event");
        for (int i = 0; i < eventElements.getLength(); i++) {
            final org.w3c.dom.Element eventElement = (org.w3c.dom.Element) eventElements.item(i);

            final String   eventName         = normalizeName(eventElement.getAttribute("name"));
            final NodeList eventDescriptions = eventElement.getElementsByTagName("description");
            final NodeList eventArguments    = eventElement.getElementsByTagName("arg");

            final MethodSpec.Builder methodBuilder = MethodSpec.methodBuilder(eventName);

            final CodeBlock.Builder methodBody = CodeBlock.builder();
            methodBody.add("$[new $T(this, $L)",
                           WArgs.class,
                           i + 1);
            final LinkedHashMap<String, String> argumentSummaries = new LinkedHashMap<>();
            for (int j = 0; j < eventArguments.getLength(); j++) {
                final org.w3c.dom.Element eventArgument   = (org.w3c.dom.Element) eventArguments.item(j);
                final String              argumentName    = normalizeName(eventArgument.getAttribute("name"));
                final String              argumentType    = eventArgument.getAttribute("type");
                final String              argumentSummary = eventArgument.getAttribute("summary");

                argumentSummaries.put(argumentName,
                                      argumentSummary);

                final TypeName javaTypeName = toJavaTypeName(eventArgument,
                                                             packageName,
                                                             argumentType);

                final ParameterSpec parameterSpec = ParameterSpec.builder(javaTypeName,
                                                                          argumentName,
                                                                          Modifier.FINAL)
                                                                 .build();
                //add method parameters
                methodBuilder.addParameter(parameterSpec);
                //use method parameter in method body
                methodBody.add(".arg($N)",
                               parameterSpec);
            }
            methodBody.add(".send();\n$]");

            addDescriptions(eventDescriptions,
                            methodBuilder,
                            argumentSummaries);
            methodBuilder.addCode(methodBody.build());
            methodSpecs.add(methodBuilder.build());
        }

        return methodSpecs;
    }

    private void createRequestsInterface(final String[] copyrights,
                                         final org.w3c.dom.Element interfaceElement,
                                         final String packageName) throws IOException {

        final String   interfaceName       = interfaceElement.getAttribute("name");
        final String   interfaceVersion    = interfaceElement.getAttribute("version");
        final NodeList descriptionElements = interfaceElement.getElementsByTagName("description");

        final int maxVersion = Integer.parseInt(interfaceVersion);

        //iterate versions
        for (int version = 1; version <= maxVersion; version++) {
            final String requestsName = requestsNameCamelCase(interfaceName,
                                                              Integer.toString(version));
            final TypeSpec.Builder requestBuilder = TypeSpec.interfaceBuilder(requestsName);
            addDescriptions(descriptionElements,
                            requestBuilder);

            if (version > 1) {
                requestBuilder.addSuperinterface(ClassName.get(packageName,
                                                               requestsNameCamelCase(interfaceName,
                                                                                     Integer.toString(version - 1))));
            }

            //methods
            final List<MethodSpec> methodSpecs     = new LinkedList<>();
            final NodeList         requestElements = interfaceElement.getElementsByTagName("request");
            for (int i = 0; i < requestElements.getLength(); i++) {
                final org.w3c.dom.Element requestElement = (org.w3c.dom.Element) requestElements.item(i);

                final String since          = requestElement.getAttribute("since");
                final int    requestVersion = Integer.parseInt(since.isEmpty() ? "1" : since);
                if (requestVersion != version) {
                    continue;
                }

                final String   requestName         = normalizeName(requestElement.getAttribute("name"));
                final NodeList requestDescriptions = requestElement.getElementsByTagName("description");

                final MethodSpec.Builder methodBuilder = MethodSpec.methodBuilder(requestName);
                methodBuilder.addModifiers(Modifier.PUBLIC,
                                           Modifier.ABSTRACT);

                //arguments
                methodBuilder.addParameter(ClassName.get(packageName,
                                                         resourceNameCamelCase(interfaceName)),
                                           "resource");
                final NodeList requestArguments = requestElement.getElementsByTagName("arg");

                final LinkedHashMap<String, String> argumentSummaries = new LinkedHashMap<>();
                for (int j = 0; j < requestArguments.getLength(); j++) {
                    final org.w3c.dom.Element requestArgument = (org.w3c.dom.Element) requestArguments.item(j);

                    final String argumentName    = normalizeName(requestArgument.getAttribute("name"));
                    final String argumentType    = requestArgument.getAttribute("type");
                    final String argumentSummary = requestArgument.getAttribute("summary");

                    argumentSummaries.put(argumentName,
                                          argumentSummary);

                    final TypeName javaTypeName = toJavaTypeName(requestArgument,
                                                                 packageName,
                                                                 argumentType);

                    final ParameterSpec parameterSpec = ParameterSpec.builder(javaTypeName,
                                                                              argumentName)
                                                                     .build();
                    methodBuilder.addParameter(parameterSpec);
                }

                addDescriptions(requestDescriptions,
                                methodBuilder,
                                argumentSummaries);
                methodSpecs.add(methodBuilder.build());
            }

            methodSpecs.forEach(requestBuilder::addMethod);
            final JavaFile.Builder builder = JavaFile.builder(packageName,
                                                              requestBuilder.build());
            addCopyright(copyrights,
                         builder);
            final JavaFile javaFile = builder.build();
            javaFile.writeTo(this.processingEnv.getFiler());
        }
    }

    private String enumNameCamelCase(final String interfaceName,
                                     final String enumName) {
        return CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL,
                                              String.format("%s_%s",
                                                            interfaceName,
                                                            enumName));
    }

    private String requestsNameCamelCase(final String name,
                                         final String version) {
        final String underscoreName = version.equals("1") ? String.format("%s_requests",
                                                                          name) : String.format("%s_requests_v%s",
                                                                                                name,
                                                                                                version);
        return CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL,
                                              underscoreName);
    }

    private String resourceNameCamelCase(final String name) {
        return CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL,
                                              String.format("%s_resource",
                                                            name));
    }
}
