'use client';

// Auto-assembled legal page. DRAFT — must be reviewed by an attorney before publishing.
// Bilingual ES/EN via useLegalLang(). Placeholders marked [POR DEFINIR / TO BE SET].
import LegalPage, { Section, useLegalLang } from '@/components/LegalPage';

const C = {
  "es": {
    "title": "LetShoot — Condiciones del Servicio",
    "s": [
      {
        "h": "1. Aceptación de las Condiciones",
        "p": [
          "1.1 Estas Condiciones del Servicio (las \"Condiciones\") constituyen un acuerdo vinculante entre usted y ASM Media Group LLC (\"ASM Media Group\", \"LetShoot\", \"nosotros\" o \"nuestro\"), operador del sitio web letshoot.ai y de sus aplicaciones, portales y servicios relacionados (conjuntamente, el \"Servicio\"). Al crear una cuenta, marcar la casilla de aceptación, hacer clic en \"Acepto\", cargar cualquier material o acceder o usar de otro modo el Servicio, usted reconoce que ha leído y entendido, y acepta quedar obligado por, estas Condiciones y por todas las políticas incorporadas por referencia, incluidas la Política de Privacidad, la Política de Datos Biométricos, la Política de Uso Aceptable, la Declaración de Cumplimiento 2257, la Política de Quejas y Retirada de Contenido y la Política de Reembolsos.",
          "1.2 Si no está de acuerdo con estas Condiciones, no debe acceder ni usar el Servicio.",
          "1.3 Estas Condiciones entran en vigor el «[POR DEFINIR: fecha de entrada en vigor]» y se aplican a todos los usuarios en todo el mundo, con sujeción a las disposiciones de ley local de la Sección 26. Si acepta estas Condiciones en nombre de una empresa, agencia u otra entidad, declara estar autorizado para obligarla, y \"usted\" se refiere tanto a usted como a esa entidad.",
          "1.4 Determinadas funciones (por ejemplo, el entrenamiento del modelo de imagen, la generación de contenido y los pagos) se rigen por formularios de pedido, descripciones de plan o condiciones complementarias que se presentan en el momento de la compra o activación; dichas condiciones complementarias se incorporan y forman parte de estas Condiciones. En caso de conflicto, prevalecerán las condiciones complementarias respecto de la función que rigen."
        ]
      },
      {
        "h": "2. Elegibilidad y acceso exclusivo para adultos mayores de 18 años",
        "p": [
          "2.1 El Servicio está estrictamente limitado a personas adultas. Debe tener al menos dieciocho (18) años, o la mayoría de edad de su jurisdicción si fuera superior, para acceder, registrarse o usar cualquier parte del Servicio. No existen excepciones.",
          "2.2 El Servicio está destinado únicamente a creadores de contenido para adultos verificados que deseen crear, entrenar y usar un modelo de imagen (IA) de su propia persona, y a sus agentes y agencias debidamente autorizados. No está dirigido a menores ni puede ser usado por ellos.",
          "2.3 Al usar el Servicio, usted declara y garantiza que: (a) tiene al menos 18 años y puede acreditarlo mediante la verificación descrita en la Sección 6; (b) toda persona que aparezca en cualquier material que usted cargue, y toda persona cuya imagen se incorpore en cualquier modelo que usted entrene, es usted y nadie más, y tenía al menos 18 años en el momento en que se captó cada imagen o vídeo; y (c) su uso del Servicio es lícito en su jurisdicción.",
          "2.4 El Servicio contiene y genera material sexualmente explícito y exclusivo para adultos. Al continuar, usted afirma que busca dicho material de forma voluntaria, que es lícito que lo reciba en el lugar en que se encuentra y que no lo expondrá a ningún menor ni a ninguna persona que no haya consentido verlo.",
          "2.5 Empleamos medidas de aseguramiento de la edad y de verificación de identidad, y podemos denegar, suspender o cancelar el acceso a cualquier persona respecto de la que tengamos motivos razonables para creer que es menor de edad o que falsea su edad o identidad."
        ]
      },
      {
        "h": "3. Definiciones",
        "p": [
          "3.1 \"Creador\" significa la persona adulta que se registra para crear, entrenar y usar un modelo de imagen (IA) de su propia persona a través del Servicio.",
          "3.2 \"Agencia\" y \"Usuario Autorizado\" significan, respectivamente, la entidad y la persona física a quienes un Creador autoriza a operar la cuenta del Creador conforme a la Sección 10.",
          "3.3 \"Modelo de Imagen\" o \"Modelo\" significa el modelo de aprendizaje automático propio de cada Creador (incluido cualquier adaptador LoRA o pesos ajustados) entrenado con el material de origen del propio Creador para reproducir su imagen verificada.",
          "3.4 \"Material de Entrenamiento\" significa las fotografías, vídeos y demás material de origen que un Creador carga de sí mismo con el fin de entrenar un Modelo.",
          "3.5 \"Contenido Generado\" significa las imágenes, vídeos y demás resultados producidos por el Servicio usando un Modelo.",
          "3.6 \"Contenido del Creador\" significa, conjuntamente, el Material de Entrenamiento, el Contenido Generado y demás material aportado por, o generado para, un Creador.",
          "3.7 \"Imagen\" (o \"Likeness\") significa el rostro, el cuerpo, la voz y demás características físicas individualmente identificables de una persona física.",
          "3.8 \"Datos Biométricos\" significa los identificadores biométricos y la información biométrica según se definen en la ley aplicable, incluidas las plantillas de geometría facial y demás plantillas biométricas derivadas del Material de Entrenamiento o de la captura de prueba de vida.",
          "3.9 \"NCII\" significa imágenes íntimas no consentidas, incluidas las representaciones visuales íntimas auténticas y generadas por ordenador de una persona identificable creadas o difundidas sin consentimiento.",
          "3.10 \"CSAM\" significa material de abuso sexual infantil, incluida cualquier representación sexualizada real, aparente o generada por ordenador de una persona menor de 18 años.",
          "3.11 \"Registros 2257\" significa los registros que estamos obligados a crear y mantener conforme a 18 U.S.C. §§ 2257 y 2257A y a 28 C.F.R. Parte 75.",
          "3.12 \"Custodio de Registros\" significa la persona y el domicilio designados en la Sección 13.3 para mantener y poner a disposición los Registros 2257.",
          "3.13 \"Redes de Tarjetas\" significa Visa, Mastercard y cualquier otra red de tarjetas de pago cuyas normas se apliquen al Servicio.",
          "3.14 \"Procesador de Pagos\" significa CCBill, Epoch u otro procesador de pagos que designemos."
        ]
      },
      {
        "h": "4. Cuentas, registro y seguridad de la cuenta",
        "p": [
          "4.1 Para usar la mayoría de las funciones debe registrar una cuenta y proporcionar información veraz, actual y completa, y mantenerla actualizada. Solo puede tener una cuenta, salvo que acordemos otra cosa por escrito.",
          "4.2 Usted es responsable de proteger sus credenciales y de toda la actividad realizada en su cuenta, incluida la de sus Usuarios Autorizados. No comparta sus credenciales salvo a través de los controles de Usuario Autorizado descritos en la Sección 10.",
          "4.3 Debe notificarnos de inmediato a soporte@letshoot.ai cualquier uso no autorizado o sospecha de vulneración de su cuenta.",
          "4.4 Podemos negarnos a abrir, recuperar o exigir cambios en cualquier nombre de usuario, y podemos rechazar registros o cerrar cuentas para cumplir con la ley, las normas de las Redes de Tarjetas o estas Condiciones.",
          "4.5 Usted es responsable de obtener y mantener los dispositivos, el software y la conectividad necesarios para usar el Servicio."
        ]
      },
      {
        "h": "5. Estatus regulatorio, naturaleza del Servicio y cumplimiento de las Redes de Tarjetas",
        "p": [
          "5.1 LetShoot es una plataforma de software como servicio y una herramienta de producción de contenido para adultos. Proporcionamos tecnología que entrena el modelo de imagen (IA) propio de un Creador y genera imágenes y vídeos para adultos de la imagen verificada de ese Creador, siguiendo sus instrucciones, para que el Creador pueda venderlos en plataformas de contenido para adultos de terceros. No somos empleadores de los Creadores, no somos una agencia de talentos y, salvo por lo expresamente indicado en la Sección 13, no somos distribuidores del Contenido Generado al público.",
          "5.2 Dado que el Servicio implica contenido para adultos y pagos con tarjeta, operamos conforme a las normas de las Redes de Tarjetas, incluidos el Visa Integrity Risk Program (VIRP) y el Registro de Comerciante de Especialidad y los requisitos de contenido para adultos de Mastercard, así como conforme a los requisitos de nuestros Procesadores de Pagos. Usted acepta que su uso del Servicio y todo el Contenido del Creador deben cumplir dichas normas según se modifiquen periódicamente.",
          "5.3 Las normas de las Redes de Tarjetas exigen, entre otras cosas, la verificación documentada de la edad y la identidad de toda persona representada, el consentimiento documentado para la creación y distribución de cada pieza de contenido para adultos, la revisión del contenido antes de su publicación, un proceso funcional de quejas y retirada, y la presentación periódica de informes a los adquirentes. Estas Condiciones implementan dichos requisitos, y podemos imponer controles adicionales en cualquier momento para mantener el cumplimiento.",
          "5.4 Podemos modificar, condicionar o discontinuar cualquier función para cumplir con la ley, con las normas de las Redes de Tarjetas o con los requisitos del Procesador de Pagos, incluida la eliminación o el rechazo de cualquier contenido o método de pago."
        ]
      },
      {
        "h": "6. Verificación de identidad y edad",
        "p": [
          "6.1 Antes de entrenar cualquier Modelo, generar cualquier contenido o procesar cualquier pago a su favor, usted debe completar la verificación de identidad y edad. Como mínimo, esto requiere un documento de identidad oficial con fotografía válido y una captura de \"prueba de vida\" en tiempo real (una selfie o un breve vídeo) que se utiliza para confirmar que usted es la persona que figura en dicho documento y que coincide con el Material de Entrenamiento.",
          "6.2 La verificación puede realizarla nosotros o un proveedor externo de verificación de identidad. Usted consiente la recogida, el tratamiento y, cuando lo exijan la ley o las normas de las Redes de Tarjetas, la conservación de sus documentos de identidad y de los resultados de la verificación con fines de cumplimiento y de mantenimiento de registros.",
          "6.3 Usted declara que toda la información de identidad y verificación que proporciona es veraz, actual y le pertenece. Presentar el documento de identidad de otra persona, un documento falsificado o alterado, o la imagen de otra persona, es causa de cancelación inmediata y puede denunciarse a las autoridades.",
          "6.4 Podemos volver a verificar su identidad y edad en cualquier momento y podemos suspender el entrenamiento, la generación o los pagos hasta que se complete la nueva verificación. Podemos rechazar o revocar la verificación cuando no podamos confirmar razonablemente su identidad o edad.",
          "6.5 La verificación es una condición de, y un consentimiento distinto de, las licencias biométrica y de contenido descritas en las Secciones 7 y 11."
        ]
      },
      {
        "h": "7. Concesión de licencia sobre la imagen (IA)",
        "p": [
          "7.1 Para operar el Servicio, usted debe conceder, y al cargar Material de Entrenamiento e instruirnos para entrenar un Modelo usted concede, a LetShoot una licencia para usar su Imagen y su Material de Entrenamiento con el único fin de prestarle el Servicio. Esto incluye ingerir, procesar y analizar su Material de Entrenamiento, derivar Datos Biométricos y pesos del modelo, entrenar y almacenar su Modelo, y generar Contenido Generado siguiendo sus instrucciones.",
          "7.2 La licencia que usted concede es: (a) limitada, y con el único fin de prestarle el Servicio y de cumplir con la ley; (b) no exclusiva; (c) revocable por usted según se describe en la Sección 16; (d) no cesible ni sublicenciable por nosotros, salvo a nuestros proveedores de servicios (como proveedores de alojamiento, cómputo y verificación de identidad) que actúen por cuenta nuestra bajo obligaciones de confidencialidad y protección de datos, y salvo lo exigido para cumplir con la ley; y (e) limitada en su duración al menor de: la vida de su cuenta más cualquier período de conservación de registros exigido por ley, o diez (10) años desde la fecha en que se aporte cada elemento, tras lo cual la licencia expira salvo que usted la renueve.",
          "7.3 No adquirimos la titularidad de su Imagen, de su Material de Entrenamiento ni de su Contenido Generado. No usaremos su Imagen ni su Modelo para generar contenido para ningún otro usuario, para crear un modelo \"compartido\", \"compuesto\" o de \"marketplace\", ni con fines de publicidad, promoción o entrenamiento de modelos para propósitos no relacionados, sin su consentimiento expreso, específico y por escrito (opt-in), que usted puede rechazar o retirar posteriormente.",
          "7.4 Podemos usar datos técnicos anonimizados y agregados que no reproduzcan su Imagen para operar, proteger y mejorar el Servicio.",
          "7.5 Esta licencia no nos autoriza a publicar ni distribuir su Contenido Generado al público; la distribución es su responsabilidad y su decisión, con sujeción a las Secciones 12 a 18."
        ]
      },
      {
        "h": "8. Titularidad del Creador y derecho de imagen (right of publicity)",
        "p": [
          "8.1 Entre usted y LetShoot, usted es titular de su Imagen, de su derecho de imagen (right of publicity), de su Material de Entrenamiento y, con sujeción a las licencias de estas Condiciones y a cualquier licencia de herramientas de terceros que se le revele, del Contenido Generado producido a partir de su Modelo.",
          "8.2 Nada en estas Condiciones nos transfiere su derecho de imagen ni sus derechos de privacidad. La licencia de la Sección 7 no es una venta ni una cesión de esos derechos.",
          "8.3 Usted es responsable de cómo explota su Contenido Generado, incluidos los acuerdos que celebre con plataformas para adultos, seguidores o terceros, y del pago de los impuestos sobre sus ganancias.",
          "8.4 En la medida en que alguna jurisdicción trate los pesos del modelo o los Datos Biométricos como bienes de titularidad separada, usted y nosotros acordamos que dichos pesos y Datos Biométricos los conservamos únicamente en calidad de encargado del tratamiento y custodio, para los fines limitados indicados en estas Condiciones, y quedan sujetos a sus derechos de retirada y supresión de la Sección 16."
        ]
      },
      {
        "h": "9. Solo tu propia imagen; prohibición de imagen de terceros",
        "p": [
          "9.1 El Servicio solo puede usarse para crear y generar contenido que represente su propia imagen verificada. Esta es la regla más importante del Servicio.",
          "9.2 No debe cargar, entrenar con, ni intentar generar contenido que represente a ninguna persona distinta de usted, incluida cualquier pareja actual o anterior, cualquier celebridad o figura pública, cualquier composición ficticia pero de apariencia real de otra persona identificable, o cualquier persona que no haya completado personalmente la verificación y otorgado su consentimiento a través del Servicio.",
          "9.3 No debe cargar ninguna imagen o vídeo en el que otra persona real e identificable aparezca de una forma que pudiera reproducir la imagen de esa persona en un Modelo o en el Contenido Generado.",
          "9.4 El contenido que represente, o que un revisor razonable pudiera creer que representa, a un tercero identificable sin su consentimiento verificado está prohibido, será bloqueado o eliminado, y podrá ser denunciado.",
          "9.5 La imagen de cada Creador solo puede entrenarse y usarse bajo la cuenta y el consentimiento verificados del propio Creador. Dos o más personas que deseen aparecer juntas deben ser cada una un Creador verificado y otorgar cada una su consentimiento para el contenido específico; podemos exigir documentación adicional para cualquier contenido con varias personas.",
          "9.6 La infracción de esta Sección constituye un incumplimiento esencial y es causa de cancelación inmediata, pérdida del contenido infractor y remisión a las autoridades cuando el contenido sea ilícito (incluido NCII o CSAM)."
        ]
      },
      {
        "h": "10. Usuarios Autorizados y delegación en agencias",
        "p": [
          "10.1 Un Creador puede autorizar a una o varias personas o a una agencia (\"Usuarios Autorizados\") a operar la cuenta del Creador para tareas cotidianas como cargar Material de Entrenamiento aprobado del Creador, solicitar generaciones, organizar contenido y gestionar la publicación en plataformas de terceros, en la medida en que el Creador habilite esos permisos.",
          "10.2 El Creador sigue siendo plenamente responsable de toda la actividad de la cuenta, incluidos todos los actos y omisiones de los Usuarios Autorizados, y de asegurar que estos cumplan estas Condiciones.",
          "10.3 Un Usuario Autorizado o una agencia no puede otorgar, ampliar, transferir ni retirar el consentimiento biométrico ni el consentimiento sobre la Imagen del Creador. El consentimiento para el tratamiento biométrico, el entrenamiento del modelo y la Licencia de Imagen (IA) solo puede otorgarlo o retirarlo el Creador personalmente, a través de su identidad verificada, y nunca puede delegarse. Todo consentimiento, concesión de licencia o retirada pretendidamente presentado por un Usuario Autorizado en lugar del Creador es nulo.",
          "10.4 Una agencia debe tener un acuerdo por escrito con el Creador que autorice su función. Podemos exigir prueba de esa autoridad, y podemos suspender o retirar a cualquier Usuario Autorizado a petición del Creador o cuando tengamos motivos razonables para creer que el arreglo se está abusando, es no consentido o infringe estas Condiciones o la ley.",
          "10.5 El Creador puede revocar el acceso de cualquier Usuario Autorizado en cualquier momento. La revocación no exime al Creador de su responsabilidad por los actos ocurridos mientras el acceso estuvo concedido."
        ]
      },
      {
        "h": "11. Datos Biométricos: consentimiento, conservación y destrucción",
        "p": [
          "11.1 Para entrenar y operar su Modelo, el Servicio recoge y trata Datos Biométricos derivados de su Material de Entrenamiento y de su captura de prueba de vida, incluidas plantillas de geometría facial y otros identificadores e información biométricos. Esto constituye un \"identificador biométrico\"/\"información biométrica\" bajo la Ley de Privacidad de la Información Biométrica de Illinois (BIPA) y leyes comparables, y una \"categoría especial\" de datos personales bajo el Artículo 9 del RGPD de la UE/Reino Unido.",
          "11.2 Finalidad y consentimiento. Recogemos y usamos sus Datos Biométricos con las únicas finalidades de verificar su identidad y edad, entrenar y operar su Modelo de Imagen, generar contenido siguiendo sus instrucciones y cumplir con la ley y las normas de las Redes de Tarjetas. Antes de cualquier recogida, usted debe revisar nuestra Política de Datos Biométricos y otorgar una autorización por escrito / consentimiento explícito (que puede otorgarse electrónicamente). No está obligado a consentir, pero sin consentimiento no podemos prestar el Servicio esencial.",
          "11.3 Sin venta ni divulgación no relacionada. No vendemos, arrendamos, intercambiamos ni obtenemos beneficio de otro modo de sus Datos Biométricos, y no los divulgamos salvo: a proveedores de servicios que actúen por cuenta nuestra bajo términos escritos de confidencialidad y protección de datos; según usted indique; o según lo exijan la ley, un proceso legal válido o el cumplimiento de las Redes de Tarjetas.",
          "11.4 Calendario de conservación. Conservamos sus Datos Biométricos únicamente durante el tiempo necesario para las finalidades anteriores y, en todo caso, no más allá del primero de: (a) la satisfacción de la finalidad para la que se recogieron; (b) tres (3) años desde su última interacción con el Servicio; o (c) el momento en que usted retire el consentimiento o suprima su Modelo conforme a la Sección 16. Los registros que estamos legalmente obligados a conservar conforme a la Sección 13 se guardan por separado y solo durante el período obligatorio.",
          "11.5 Destrucción. Al expirar el período de conservación, al retirar usted el consentimiento o al suprimir su Modelo, destruiremos permanentemente sus Datos Biométricos y los pesos del Modelo que incorporen su Imagen, e instruiremos a nuestros encargados del tratamiento para que hagan lo mismo, salvo los datos que estemos legalmente obligados a conservar, que aislaremos, restringiremos de tratamiento ulterior y destruiremos cuando finalice la obligación legal.",
          "11.6 Sus derechos. Según dónde resida, puede tener derechos de acceso, rectificación, supresión, portabilidad o limitación del tratamiento de sus Datos Biométricos y demás datos personales, y a retirar el consentimiento, según se describe en la Política de Privacidad. Retirar el consentimiento biométrico detendrá todo entrenamiento y generación posteriores y activará la supresión conforme a la Sección 16.",
          "11.7 Seguridad. Implementamos salvaguardas técnicas y organizativas destinadas a proteger los Datos Biométricos empleando el estándar de diligencia razonable de nuestro sector, y no inferior al que aplicamos a nuestra propia información confidencial."
        ]
      },
      {
        "h": "12. Divulgación y procedencia del contenido generado por IA",
        "p": [
          "12.1 Todo el Contenido Generado es contenido generado por inteligencia artificial que representa el Modelo de Imagen (IA) del Creador; no es una grabación fotográfica inalterada de un evento en vivo. Usted lo reconoce y acepta representar la naturaleza del contenido de forma veraz.",
          "12.2 Aplicamos medidas de procedencia y divulgación al Contenido Generado, que pueden incluir etiquetas visibles, metadatos incrustados (como señales de credenciales de contenido C2PA) y/o marcas de agua visibles o invisibles que indican que el contenido es generado por IA. Estas medidas apoyan las normas de las Redes de Tarjetas, las leyes emergentes de etiquetado de IA y la detección de NCII/deepfakes.",
          "12.3 No debe eliminar, alterar, ocultar ni anular ninguna etiqueta de procedencia, marca de agua, metadato o credencial de contenido que apliquemos, y no debe presentar el Contenido Generado como una fotografía o vídeo espontáneo o inalterado de un evento real cuando ello sea engañoso o ilícito.",
          "12.4 Cuando publique Contenido Generado en plataformas de terceros, usted es responsable de cumplir las normas de divulgación de IA de esas plataformas y las leyes aplicables de transparencia de IA o de divulgación de medios sintéticos en las jurisdicciones donde se ofrezca el contenido.",
          "12.5 Podemos negarnos a entregar, o volver a procesar, cualquier Contenido Generado cuyas señales de procedencia se hayan eliminado o que no pueda etiquetarse de forma fiable."
        ]
      },
      {
        "h": "13. Mantenimiento de registros (18 U.S.C. §§ 2257 / 2257A); condición de productor; Custodio de Registros",
        "p": [
          "13.1 El Servicio produce representaciones visuales de adultos reales y verificados que participan en conducta sexual explícita real o simulada. Respecto del Contenido Generado producido a través del Servicio, LetShoot actúa como \"productor\" (\"producer\") en el sentido de 18 U.S.C. §§ 2257 y 2257A y de 28 C.F.R. Parte 75, y mantiene los registros que dichas disposiciones exigen.",
          "13.2 A tal fin, recogemos y conservamos, para cada Creador verificado, los registros exigidos por ley, que pueden incluir el nombre legal del Creador y cualquier alias o nombre artístico conocido, la fecha de nacimiento, una copia del documento de identidad oficial con fotografía usado para la verificación, y los registros de verificación y consentimiento asociados al Material de Entrenamiento y al Contenido Generado del Creador.",
          "13.3 Custodio de Registros. El Custodio de Registros de los materiales producidos a través del Servicio es «[POR DEFINIR: Custodio de Registros — nombre legal completo y domicilio físico en EE. UU. (no apartado postal) donde se mantienen los Registros 2257 y están disponibles para inspección]». La declaración de mantenimiento de registros y divulgación exigida por ley, incluidos el nombre y el domicilio del Custodio, se publica en nuestra Declaración de Cumplimiento 2257.",
          "13.4 Usted acepta proporcionar información veraz para estos registros, cooperar con nuestra verificación y mantener su información actualizada. Reconoce que podemos estar obligados a exhibir estos registros ante inspectores autorizados y que los conservaremos durante el período exigido por ley incluso después de que cierre su cuenta o se suprima su Modelo.",
          "13.5 En la medida en que usted también publique o distribuya Contenido Generado por su cuenta, puede tener obligaciones propias e independientes de mantenimiento de registros o de etiquetado; nada de lo aquí dispuesto le exime de las obligaciones que le correspondan como distribuidor."
        ]
      },
      {
        "h": "14. Uso aceptable y contenido prohibido; tolerancia cero al CSAM",
        "p": [
          "14.1 Debe cumplir en todo momento nuestra Política de Uso Aceptable. Las prohibiciones siguientes son términos esenciales de estas Condiciones.",
          "14.2 Tolerancia cero al CSAM. Nunca debe cargar, solicitar, generar, almacenar, transmitir ni distribuir material que represente, parezca representar o sexualice a un menor, incluida cualquier representación real, ficticia, de \"age-play\", con rejuvenecimiento (de-aged), de temática \"teen\" o generada por IA que aparente ser de una persona menor de 18 años. Esto está prohibido sin excepción. Utilizamos herramientas de detección y revisión humana, y denunciamos el aparente material de abuso sexual infantil al National Center for Missing & Exploited Children (NCMEC) y, cuando corresponda, a las autoridades, y conservamos los datos relacionados según lo exija la ley. Los infractores serán cancelados de inmediato.",
          "14.3 Nada de imagen de terceros ni no consentida. No debe crear contenido de nadie que no sea usted mismo verificado (Sección 9), y no debe crear ni distribuir imágenes íntimas no consentidas ni deepfakes de ninguna persona real (Sección 18).",
          "14.4 Otras conductas y contenidos prohibidos incluyen, sin limitación: contenido sexual no consentido; contenido que represente o promueva violación, incesto con familiares reales, zoofilia, necrofilia o violencia, tortura o gore graves no consentidos; contenido que represente trata o coacción; contenido sexual con personas que no pueden consentir; uso de los documentos de identidad o la imagen de otra persona; la elusión de los controles de verificación, procedencia o seguridad; la carga de malware; el scraping o el acceso automatizado no autorizado; la infracción de los derechos de propiedad intelectual de terceros; y cualquier uso que infrinja la ley o las normas de las Redes de Tarjetas.",
          "14.5 El contenido prohibido está sujeto a bloqueo, eliminación, conservación, denuncia y cancelación de la cuenta. Determinadas categorías (CSAM, NCII, trata) se denunciarán a las autoridades competentes con independencia de la intención que usted declare.",
          "14.6 Podemos actualizar la lista de contenido prohibido para cumplir requisitos legales y de las Redes de Tarjetas, y dichas actualizaciones surten efecto al publicarse."
        ]
      },
      {
        "h": "15. Revisión del contenido antes de su publicación o entrega",
        "p": [
          "15.1 Según lo exigen las normas de las Redes de Tarjetas y nuestro programa de cumplimiento, el Contenido Generado y, cuando proceda, el Material de Entrenamiento están sujetos a revisión antes de que el contenido se le entregue para su distribución o se ponga a disposición para su publicación.",
          "15.2 La revisión puede combinar filtrado automatizado (para CSAM, imagen de terceros, señales de no consentimiento y categorías prohibidas) con moderación humana. Podemos retrasar, retener, marcar con agua, editar los metadatos de, o rechazar cualquier contenido que no supere la revisión.",
          "15.3 La revisión es un control de seguridad y cumplimiento en beneficio de las personas afectadas y del ecosistema de pagos. No nos convierte en editor de su Contenido Generado, no garantiza que el contenido sea lícito en todas las jurisdicciones y no nos traslada su responsabilidad por una distribución lícita.",
          "15.4 No debe intentar eludir la revisión, ni publicar o distribuir contenido que no haya superado la revisión cuando esta sea obligatoria."
        ]
      },
      {
        "h": "16. Retirada del consentimiento y supresión del Modelo",
        "p": [
          "16.1 Puede retirar su consentimiento biométrico y sobre la Imagen y solicitar la supresión de su Modelo en cualquier momento, a través de la configuración de su cuenta o contactándonos en soporte@letshoot.ai. Solo el Creador, mediante identidad verificada, puede hacerlo (Sección 10.3).",
          "16.2 Tras una solicitud válida de retirada o supresión, en un plazo comercialmente razonable y no superior a «[POR DEFINIR: plazo de supresión, p. ej., 30 días]»: dejaremos de entrenar y generar con su Modelo; desactivaremos y luego suprimiremos permanentemente los pesos de su Modelo y sus Datos Biométricos; e instruiremos a nuestros encargados del tratamiento para que hagan lo mismo.",
          "16.3 La supresión está sujeta a la conservación exigida por ley de la Sección 13 (Registros 2257) y a cualquier registro que debamos conservar para cumplir la ley, resolver controversias o hacer valer nuestros acuerdos. Dichos registros conservados quedarán restringidos de tratamiento ulterior y se destruirán cuando finalice la obligación.",
          "16.4 La retirada y la supresión no afectan a: (a) el Contenido Generado que usted ya haya descargado, publicado o distribuido; (b) las copias en poder lícito de terceros a quienes usted distribuyó contenido; ni (c) la licitud del tratamiento realizado antes de la retirada. Usted es responsable de retirar de las plataformas de terceros el contenido que ya haya publicado.",
          "16.5 La supresión de su Modelo puede poner fin a su capacidad de usar funciones esenciales y puede dar lugar al cierre de su cuenta."
        ]
      },
      {
        "h": "17. Quejas, apelaciones y retirada de contenido",
        "p": [
          "17.1 Mantenemos un proceso de quejas y retirada de contenido, disponible para los Creadores, las personas representadas en el contenido y terceros, en soporte@letshoot.ai y a través de las herramientas de denuncia que proporcionemos.",
          "17.2 Cualquier persona puede denunciar contenido que considere que infringe estas Condiciones o sus derechos, incluido el contenido que crea que la representa sin consentimiento, que infringe sus derechos o que es de otro modo ilícito. Las denuncias deben identificar el contenido, el fundamento de la queja y la relación del denunciante con el mismo.",
          "17.3 Acusaremos recibo de las quejas y las revisaremos, y las resolveremos —incluida la eliminación o restricción del contenido cuando proceda— en un plazo de siete (7) días hábiles desde la recepción de una denuncia completa, salvo que las denuncias de NCII/deepfakes se gestionan según el plazo acelerado de la Sección 18 y el CSAM se atiende de inmediato.",
          "17.4 Apelaciones. Un Creador cuyo contenido haya sido eliminado o restringido, y un denunciante disconforme con nuestra decisión, pueden apelar respondiendo a nuestra decisión dentro del plazo que indiquemos. Revisaremos las apelaciones de buena fe y comunicaremos el resultado. Determinadas eliminaciones exigidas por la ley o por las normas de las Redes de Tarjetas no son reversibles.",
          "17.5 Conservamos registros de las quejas, acciones y apelaciones, y podemos comunicar información agregada a nuestros adquirentes y, cuando se exija, a las autoridades."
        ]
      },
      {
        "h": "18. Imágenes íntimas no consentidas y deepfakes (Ley TAKE IT DOWN)",
        "p": [
          "18.1 En consonancia con la Ley federal TAKE IT DOWN y leyes comparables, prohibimos las imágenes íntimas no consentidas (NCII) y los \"deepfakes\" sexuales no consentidos, ya sean auténticos o generados por ordenador, de cualquier persona identificable.",
          "18.2 Notificación y retirada. Una persona identificable (o alguien autorizado para actuar en su nombre) que crea que a través del Servicio hay disponibles representaciones visuales íntimas suyas sin consentimiento puede presentar una solicitud de retirada a nuestro contacto designado en «[POR DEFINIR: contacto de retirada de NCII / agente designado — correo electrónico y domicilio postal]». Una solicitud válida debe incluir: una declaración firmada (física o electrónica) de que quien solicita es la persona representada o un representante autorizado y de que la representación se realizó, o se está poniendo a disposición, sin consentimiento; información razonablemente suficiente para localizar el contenido; y datos de contacto.",
          "18.3 Al recibir una solicitud válida, eliminaremos la representación visual íntima denunciada y haremos esfuerzos razonables para identificar y eliminar cualquier copia idéntica conocida, tan pronto como sea posible y a más tardar cuarenta y ocho (48) horas después de la recepción.",
          "18.4 Podemos usar coincidencia de hash y otras herramientas para detectar e impedir la recarga de NCII eliminadas. No trataremos una retirada de buena fe como una admisión y podemos conservar pruebas según lo permita o exija la ley.",
          "18.5 El uso indebido de este proceso (por ejemplo, presentar una falsa reclamación de consentimiento, o afirmar falsamente que un contenido es no consentido) está prohibido y puede, en sí mismo, infringir estas Condiciones y la ley.",
          "18.6 Este proceso es adicional al proceso de derechos de autor de la Sección 19 y al proceso general de quejas de la Sección 17."
        ]
      },
      {
        "h": "19. Derechos de autor, DMCA y propiedad intelectual",
        "p": [
          "19.1 Debe respetar los derechos de propiedad intelectual de terceros y solo puede cargar material del que sea titular o esté autorizado a usar. Usted declara que su Material de Entrenamiento y sus instrucciones no infringen los derechos de autor, marcas, derecho de imagen u otros derechos de ningún tercero.",
          "19.2 Respondemos a las notificaciones de presunta infracción de derechos de autor conforme a la Digital Millennium Copyright Act (DMCA). Si cree que un contenido del Servicio infringe sus derechos de autor, envíe una notificación con los elementos exigidos por 17 U.S.C. § 512(c)(3) a nuestro agente designado: «[POR DEFINIR: Agente Designado DMCA — nombre, domicilio postal, correo electrónico y teléfono, según su registro ante la Oficina de Derechos de Autor de EE. UU.]».",
          "19.3 Eliminaremos o inhabilitaremos el acceso al contenido presuntamente infractor, notificaremos al usuario afectado y aceptaremos contranotificaciones según lo previsto por la DMCA. Mantenemos y aplicamos una política de cancelación, en circunstancias apropiadas, de los usuarios que sean infractores reincidentes.",
          "19.4 El Servicio —incluidos nuestro software, modelos (distintos de los pesos de su Modelo de Imagen), interfaces de usuario, marcas y el contenido que proporcionamos— es propiedad nuestra o de nuestros licenciantes y está protegido por las leyes de propiedad intelectual. Le concedemos una licencia limitada, revocable, no exclusiva e intransferible para usar el Servicio con su finalidad prevista durante su suscripción; no recibe ningún otro derecho.",
          "19.5 El Servicio puede incorporar modelos o herramientas de IA de terceros bajo sus propias licencias; cuando dichas licencias impongan condiciones sobre los resultados, le divulgaremos los términos esenciales y usted acepta cumplirlos."
        ]
      },
      {
        "h": "20. Facturación, suscripciones, reembolsos y contracargos",
        "p": [
          "20.1 Las funciones de pago se ofrecen en condiciones de suscripción y/o de uso/créditos descritas en el momento de la compra, con precios que oscilan generalmente entre «[POR DEFINIR: rango de precios, p. ej., 200–1000 US$]» según el plan. Todas las tarifas se expresan en la moneda indicada y no incluyen impuestos salvo indicación en contrario.",
          "20.2 Los pagos son procesados por nuestros Procesadores de Pagos externos, CCBill y/o Epoch, usando Visa o Mastercard. Sus cargos aparecerán en su estado de cuenta bajo el descriptor «[POR DEFINIR: descriptor de facturación según su registro ante el procesador]». Su uso del Procesador de Pagos también está sujeto a sus propios términos y política de privacidad.",
          "20.3 Las suscripciones se renuevan automáticamente por períodos sucesivos hasta que se cancelen. Puede cancelar en cualquier momento a través de su cuenta o de las herramientas del Procesador de Pagos; la cancelación detiene las renovaciones futuras y surte efecto al final del período en curso.",
          "20.4 Reembolsos. Salvo que lo exija la ley o se indique expresamente en nuestra Política de Reembolsos, las tarifas no son reembolsables, incluidas las de entrenamientos, créditos o generaciones ya consumidos. Podemos, a nuestra discreción, conceder reembolsos parciales o totales (por ejemplo, por fallos técnicos verificados). Los consumidores de algunas jurisdicciones (incluidas la UE/Reino Unido) pueden tener derechos legales de desistimiento o cancelación, que respetamos cuando corresponden; los servicios digitales iniciados con su consentimiento antes de que finalice el plazo de desistimiento pueden reducir o eliminar dichos derechos en la medida en que la ley lo permita.",
          "20.5 Contracargos. Si tiene una incidencia de facturación, contáctenos primero en soporte@letshoot.ai; procuramos resolver las disputas con prontitud. Iniciar un contracargo o una disputa de pago sin contactarnos primero, o por servicios efectivamente prestados, constituye un incumplimiento de estas Condiciones; podemos suspender su cuenta, impugnar el contracargo con prueba de su aceptación y uso, y recuperar las tarifas y costes relacionados.",
          "20.6 Podemos cambiar precios y planes previo aviso; los cambios se aplican al siguiente ciclo de facturación. La falta de pago puede dar lugar a suspensión o cancelación y a la pérdida de acceso a funciones y contenido almacenado, con sujeción a las reglas de conservación anteriores."
        ]
      },
      {
        "h": "21. Verificación de identidad, prevención de blanqueo, sanciones y pagos",
        "p": [
          "21.1 Además de la Sección 6, nosotros y nuestros Procesadores de Pagos aplicamos controles de \"conozca a su cliente\" (KYC) y de prevención del blanqueo de capitales (AML). Usted acepta proporcionar la información de identidad, empresarial, fiscal y bancaria razonablemente requerida para verificarle y pagarle, y mantenerla exacta.",
          "21.2 Sanciones. Usted declara que no se encuentra en, ni reside habitualmente en, ni actúa en nombre de ninguna persona de un país o territorio sujeto a sanciones integrales de EE. UU. u otras aplicables, y que no figura en ninguna lista de sanciones o de partes denegadas aplicable. No prestamos el Servicio a personas sancionadas y rechazaremos o revertiremos transacciones según se requiera.",
          "21.3 Pagos. Cuando el Servicio facilite pagos a su favor (por ejemplo, de importes cobrados por cuenta suya), los pagos están sujetos a verificación, umbrales mínimos, períodos de retención o reserva por riesgo de contracargo y fraude, y cualquier deducción por tarifas, impuestos, reembolsos o importes que usted nos adeude. Podemos retener o retrasar pagos en espera de verificación, investigación de sospecha de fraude o contenido prohibido, o proceso legal.",
          "21.4 Usted es el único responsable de sus obligaciones fiscales, y podemos emitir formularios fiscales y practicar retenciones cuando la ley lo exija.",
          "21.5 Podemos reportar actividad sospechosa según se requiera y cooperar con las solicitudes lícitas de reguladores, Redes de Tarjetas y autoridades."
        ]
      },
      {
        "h": "22. Renuncia de garantías",
        "p": [
          "22.1 El Servicio se proporciona \"tal cual\" y \"según disponibilidad\", sin garantías de ningún tipo, ya sean expresas, implícitas o legales, incluidas las garantías implícitas de comerciabilidad, idoneidad para un fin determinado, titularidad y no infracción, en la máxima medida permitida por la ley.",
          "22.2 No garantizamos que el Servicio sea ininterrumpido, seguro o libre de errores, que los resultados de la IA sean exactos, realistas, consistentes o adecuados para su fin, que el contenido esté libre de defectos, ni que las herramientas de procedencia o seguridad detecten todo elemento prohibido.",
          "22.3 Los resultados generados por IA son probabilísticos y pueden contener artefactos o resultados inesperados. Usted es responsable de revisar el Contenido Generado antes de usarlo y de decidir si lo distribuye y cómo.",
          "22.4 No somos su abogado, agente ni asesor fiscal, y nada en el Servicio constituye asesoramiento legal, fiscal o financiero. Usted es responsable de su propio cumplimiento de las leyes y normas de plataforma aplicables a su distribución y venta de contenido.",
          "22.5 Algunas jurisdicciones no permiten ciertas exclusiones de garantía, por lo que partes de lo anterior pueden no aplicarse a usted; en tal caso, las garantías se limitan al alcance y la duración mínimos que la ley exija."
        ]
      },
      {
        "h": "23. Limitación de responsabilidad",
        "p": [
          "23.1 En la máxima medida permitida por la ley, ni LetShoot / ASM Media Group ni sus directivos, empleados, agentes, licenciantes o proveedores de servicios serán responsables de daños indirectos, incidentales, especiales, consecuenciales, ejemplares o punitivos, ni de la pérdida de beneficios, ingresos, fondo de comercio, datos o contenido, derivados de o relacionados con el Servicio, aunque se les hubiera advertido de tal posibilidad.",
          "23.2 En la máxima medida permitida por la ley, nuestra responsabilidad total agregada por todas las reclamaciones relacionadas con el Servicio no excederá del mayor entre el importe que usted nos haya pagado por el Servicio en los seis (6) meses anteriores al hecho que dé lugar a la reclamación, o «[POR DEFINIR: importe mínimo de responsabilidad, p. ej., 100 US$]».",
          "23.3 Las limitaciones de esta Sección se aplican a todas las teorías de responsabilidad y constituyen una base fundamental del acuerdo entre nosotros. No se aplican a la responsabilidad que no pueda limitarse por ley (por ejemplo, ciertos derechos legales de los consumidores, o la responsabilidad por negligencia grave, dolo o conducta intencional cuando no sea renunciable).",
          "23.4 Nada en estas Condiciones limita la responsabilidad de cualquiera de las partes por su propia infracción de la ley en materia de CSAM o NCII, ni por los derechos legales no renunciables de una persona, incluidas las reclamaciones de privacidad biométrica y de derecho de imagen en la medida en que dicha limitación esté prohibida."
        ]
      },
      {
        "h": "24. Indemnización",
        "p": [
          "24.1 Usted defenderá, indemnizará y mantendrá indemne a LetShoot / ASM Media Group y a sus directivos, empleados, agentes, licenciantes y proveedores de servicios frente a cualesquiera reclamaciones, demandas, responsabilidades, daños, pérdidas y costes (incluidos honorarios legales razonables) derivados de o relacionados con: (a) su Contenido del Creador, incluida cualquier reclamación de que representa a un tercero, es no consentido, es ilícito o infringe derechos; (b) su incumplimiento de estas Condiciones o de la ley o de las normas de las Redes de Tarjetas; (c) su distribución, venta o comercialización del Contenido Generado; (d) los actos u omisiones de sus Usuarios Autorizados o agencia; y (e) cualquier falseamiento de su identidad, edad o autoridad.",
          "24.2 Le notificaremos la reclamación, le permitiremos dirigir la defensa con abogados razonablemente aceptables para nosotros y cooperaremos razonablemente; podemos participar con nuestros propios abogados a nuestra costa. Usted no puede transigir una reclamación de forma que nos imponga obligaciones o admita nuestra culpa sin nuestro consentimiento por escrito.",
          "24.3 Sus obligaciones de indemnización subsisten tras la terminación de estas Condiciones."
        ]
      },
      {
        "h": "25. Suspensión y terminación",
        "p": [
          "25.1 Puede dejar de usar el Servicio y cerrar su cuenta en cualquier momento, con sujeción a las reglas de supresión y conservación anteriores.",
          "25.2 Podemos suspender o cancelar su acceso, total o parcialmente, con o sin previo aviso, si: usted incumple estas Condiciones; sospechamos razonablemente contenido prohibido (incluido CSAM, NCII o imagen de terceros), fraude o abuso de contracargos; la verificación falla o no puede mantenerse; una Red de Tarjetas, un Procesador de Pagos o la ley lo exigen; o la prestación continuada supone un riesgo legal, de seguridad o reputacional.",
          "25.3 Ante infracciones graves (incluidas las de CSAM, NCII o imagen de terceros), la cancelación puede ser inmediata y permanente, el contenido puede conservarse y denunciarse, y podemos negarnos a restablecer el acceso o los datos.",
          "25.4 Tras la terminación, dejaremos de prestar el Servicio y trataremos sus Datos Biométricos, su Modelo y su contenido conforme a las Secciones 11, 13 y 16 (la supresión queda sujeta a la conservación exigida por ley).",
          "25.5 Las disposiciones que por su naturaleza deban subsistir tras la terminación —incluidas la titularidad, las licencias concedidas a nosotros por el período limitado de cumplimiento/conservación, el mantenimiento de registros, las renuncias de garantías, la limitación de responsabilidad, la indemnización y la resolución de controversias— subsisten."
        ]
      },
      {
        "h": "26. Ley aplicable, resolución de controversias, arbitraje y renuncia a acciones colectivas",
        "p": [
          "26.1 Estas Condiciones se rigen por las leyes del Estado de «[POR DEFINIR: estado de EE. UU. cuya ley rige]» y por la ley federal de EE. UU. aplicable, sin atender a las normas de conflicto de leyes, salvo que las leyes imperativas de protección al consumidor y de protección de datos de su lugar de residencia también puedan aplicarse y no se renuncian por esta Sección.",
          "26.2 Resolución informal. Antes de iniciar cualquier procedimiento formal, usted acepta contactarnos en soporte@letshoot.ai e intentar resolver la controversia de forma informal durante al menos treinta (30) días.",
          "26.3 Arbitraje. Salvo las excepciones que se indican a continuación, toda controversia derivada de o relacionada con estas Condiciones o el Servicio se resolverá mediante arbitraje individual definitivo y vinculante administrado por «[POR DEFINIR: institución arbitral y reglas aplicables]», con sede en «[POR DEFINIR: sede/lugar del arbitraje]», sustanciado en español o inglés a elección de la parte reclamante. El laudo podrá ejecutarse ante cualquier tribunal competente.",
          "26.4 Renuncia a acciones colectivas. En la máxima medida permitida por la ley, las controversias se plantearán únicamente a título individual, y no como demandante o miembro de una clase en cualquier pretendido procedimiento colectivo, de clase, consolidado o de representación. El árbitro no podrá acumular las reclamaciones de más de una persona ni presidir ningún procedimiento de representación o de clase.",
          "26.5 Excepción sobre derecho de imagen y derechos no renunciables. No obstante lo anterior: (a) las reclamaciones relativas a su propio derecho de imagen (right of publicity), a sus derechos de privacidad biométrica o a otros derechos legales no renunciables podrán plantearse según lo permita la ley aplicable y no se renuncian, limitan ni obligan al arbitraje en la medida en que dicha ley lo prohíba; (b) cualquiera de las partes puede plantear una reclamación individual ante un tribunal de reclamaciones de menor cuantía; y (c) cualquiera de las partes puede solicitar medidas cautelares ante los tribunales para detener la infracción o el uso indebido de derechos de propiedad intelectual o de imagen, o una divulgación no autorizada. Cuando el arbitraje o la renuncia a acciones colectivas sean inexigibles para una reclamación, esa reclamación se sustanciará ante los tribunales de «[POR DEFINIR: fuero judicial]», y el resto de esta Sección seguirá aplicándose a las demás reclamaciones.",
          "26.6 Los consumidores de la UE/Reino Unido y de determinadas otras jurisdicciones conservan el derecho a interponer procedimientos en, y a la protección de las leyes imperativas de, su jurisdicción de origen; nada en esta Sección elimina esos derechos."
        ]
      },
      {
        "h": "27. Cambios en las Condiciones; contacto; agentes designados; disposiciones varias",
        "p": [
          "27.1 Cambios. Podemos actualizar estas Condiciones para reflejar cambios en el Servicio, en la ley o en las normas de las Redes de Tarjetas. Publicaremos las Condiciones actualizadas con una nueva fecha de entrada en vigor y, para cambios sustanciales, daremos un aviso razonable (por ejemplo, por correo electrónico o aviso dentro del producto). Los cambios no son retroactivos y surten efecto en la fecha indicada; su uso continuado tras esa fecha constituye aceptación. Si no está de acuerdo, debe dejar de usar el Servicio antes de la fecha de entrada en vigor.",
          "27.2 Contacto y agentes designados. Operador: ASM Media Group LLC, que opera como LetShoot (letshoot.ai). Contacto general y de soporte: soporte@letshoot.ai. Custodio de Registros: véanse la Sección 13.3 y nuestra Declaración de Cumplimiento 2257. Agente Designado DMCA: véase la Sección 19.2. Contacto de retirada de NCII: véase la Sección 18.2. Representantes de protección de datos conforme al Artículo 27 del RGPD: UE — «[POR DEFINIR: nombre y domicilio del representante en la UE (Art. 27)]»; Reino Unido — «[POR DEFINIR: nombre y domicilio del representante en el Reino Unido (Art. 27)]».",
          "27.3 Acuerdo íntegro; orden de prelación. Estas Condiciones, junto con las políticas y condiciones complementarias incorporadas por referencia, constituyen el acuerdo íntegro entre usted y nosotros respecto del Servicio, y sustituyen a los acuerdos anteriores sobre la materia.",
          "27.4 Divisibilidad; no renuncia. Si alguna disposición se declara inexigible, el resto permanecerá vigente y la disposición se modificará en la medida mínima necesaria. Que no exijamos el cumplimiento de una disposición no constituye una renuncia a ella.",
          "27.5 Cesión. Usted no puede ceder estas Condiciones sin nuestro consentimiento; nosotros podemos cederlas a una filial o sucesora (por ejemplo, en una fusión o venta), con sujeción a las protecciones biométricas y de la Imagen de estas Condiciones y a la ley aplicable.",
          "27.6 Fuerza mayor. No somos responsables de retrasos o incumplimientos causados por eventos fuera de nuestro control razonable.",
          "27.7 Idioma. Estas Condiciones se ofrecen en español e inglés; en caso de conflicto, prevalecerá la versión en «[POR DEFINIR: idioma que prevalece]», salvo que la ley local exija que prevalezca la versión en el idioma local.",
          "27.8 Notificaciones. Podemos cursar notificaciones por correo electrónico o a través del Servicio; usted consiente las comunicaciones y los registros electrónicos."
        ]
      }
    ]
  },
  "en": {
    "title": "LetShoot — Terms of Service",
    "s": [
      {
        "h": "1. Acceptance of the Terms",
        "p": [
          "1.1 These Terms of Service (the \"Terms\") form a binding agreement between you and ASM Media Group LLC (\"ASM Media Group,\" \"LetShoot,\" \"we,\" \"us,\" or \"our\"), the operator of the website letshoot.ai and its related applications, portals and services (collectively, the \"Service\"). By creating an account, checking the acceptance box, clicking \"I agree,\" uploading any material, or otherwise accessing or using the Service, you acknowledge that you have read and understood, and agree to be bound by, these Terms and by all policies incorporated by reference, including the Privacy Policy, the Biometric Data Policy, the Acceptable Use Policy, the 2257 Compliance Statement, the Complaints and Content-Removal Policy, and the Refund Policy.",
          "1.2 If you do not agree to these Terms, you must not access or use the Service.",
          "1.3 These Terms take effect on «[TO BE SET: effective date]» and apply to all users worldwide, subject to the local-law provisions in Section 26. If you accept these Terms on behalf of a company, agency or other entity, you represent that you are authorized to bind that entity, and \"you\" refers to both you and that entity.",
          "1.4 Certain features (for example, likeness-model training, content generation and payouts) are governed by additional order forms, plan descriptions or supplemental terms presented at the point of purchase or activation; those supplemental terms are incorporated into and form part of these Terms. In the event of a conflict, the supplemental terms control for the feature they govern."
        ]
      },
      {
        "h": "2. Eligibility and 18+ Adults-Only Access",
        "p": [
          "2.1 The Service is strictly limited to adults. You must be at least eighteen (18) years old, or the age of majority in your jurisdiction if higher, to access, register for or use any part of the Service. There are no exceptions.",
          "2.2 The Service is intended solely for verified adult content creators who wish to create, train and use an artificial-intelligence likeness model of their own person, and for their duly authorized agents and agencies. It is not directed to, and may not be used by, minors.",
          "2.3 By using the Service you represent and warrant that: (a) you are at least 18 years old and can prove it through the verification described in Section 6; (b) every person depicted in any material you upload, and every person whose likeness is embodied in any model you train, is you and no one else, and was at least 18 years old at the time each image or video was captured; and (c) your use of the Service is lawful in your jurisdiction.",
          "2.4 The Service contains and generates sexually explicit, adults-only material. By continuing, you affirm that you are voluntarily seeking such material, that it is lawful for you to receive it where you are located, and that you will not expose it to any minor or to any person who has not consented to view it.",
          "2.5 We use age-assurance and identity-verification measures and may deny, suspend or terminate access to anyone we reasonably believe to be a minor or to be misrepresenting their age or identity."
        ]
      },
      {
        "h": "3. Definitions",
        "p": [
          "3.1 \"Creator\" means an adult individual who registers to create, train and use an AI likeness model of their own person through the Service.",
          "3.2 \"Agency\" and \"Authorized User\" mean, respectively, an entity and an individual whom a Creator authorizes to operate the Creator's account under Section 10.",
          "3.3 \"Likeness Model\" or \"Model\" means the per-Creator machine-learning model (including any LoRA adapter or fine-tuned weights) trained on the Creator's own source material to reproduce that Creator's verified likeness.",
          "3.4 \"Training Material\" means the photographs, videos and other source material that a Creator uploads of themselves for the purpose of training a Model.",
          "3.5 \"Generated Content\" means the images, videos and other outputs produced by the Service using a Model.",
          "3.6 \"Creator Content\" means, collectively, Training Material, Generated Content and other material provided by or generated for a Creator.",
          "3.7 \"Likeness\" means a natural person's face, body, voice and other individually identifiable physical characteristics.",
          "3.8 \"Biometric Data\" means biometric identifiers and biometric information as defined under applicable law, including facial-geometry templates and other biometric templates derived from Training Material or liveness capture.",
          "3.9 \"NCII\" means non-consensual intimate imagery, including authentic and computer-generated intimate visual depictions of an identifiable person created or shared without consent.",
          "3.10 \"CSAM\" means child sexual abuse material, including any real, apparent, or computer-generated sexualized depiction of a person under 18.",
          "3.11 \"2257 Records\" means the records we are required to create and maintain under 18 U.S.C. §§ 2257 and 2257A and 28 C.F.R. Part 75.",
          "3.12 \"Custodian of Records\" means the person and address designated in Section 13.3 to keep and make available the 2257 Records.",
          "3.13 \"Card Networks\" means Visa, Mastercard and any other payment card network whose rules apply to the Service.",
          "3.14 \"Payment Processor\" means CCBill, Epoch or another payment processor we designate."
        ]
      },
      {
        "h": "4. Accounts, Registration and Account Security",
        "p": [
          "4.1 To use most features you must register an account and provide accurate, current and complete information, and keep it updated. You may hold only one account unless we agree otherwise in writing.",
          "4.2 You are responsible for safeguarding your credentials and for all activity under your account, including activity by your Authorized Users. Do not share your credentials except through the Authorized-User controls described in Section 10.",
          "4.3 You must notify us promptly at soporte@letshoot.ai of any unauthorized use or suspected compromise of your account.",
          "4.4 We may refuse to open, may reclaim, or may require changes to any username, and we may refuse registration or close accounts to comply with law, Card-Network rules or these Terms.",
          "4.5 You are responsible for obtaining and maintaining the devices, software and connectivity needed to use the Service."
        ]
      },
      {
        "h": "5. Regulatory Status, Nature of the Service and Card-Network Compliance",
        "p": [
          "5.1 LetShoot is a software-as-a-service platform and adult-content production tool. We provide technology that trains a Creator's own AI likeness model and generates adult imagery and video of that Creator's verified likeness, at the Creator's direction, so the Creator can sell it on third-party adult platforms. We are not an employer of Creators, not a talent agency, and, except as expressly stated in Section 13, not a distributor of Generated Content to the public.",
          "5.2 Because the Service involves adult content and card payments, we operate under the rules of the Card Networks, including the Visa Integrity Risk Program (VIRP) and Mastercard's Specialty Merchant Registration and adult-content requirements, and under the requirements of our Payment Processors. You agree that your use of the Service and all Creator Content must comply with those rules as they change from time to time.",
          "5.3 Card-Network rules require, among other things, documented age and identity verification of every person depicted, documented consent to the creation and distribution of each piece of adult content, pre-publication content review, a functioning complaint and takedown process, and periodic reporting to acquirers. These Terms implement those requirements, and we may impose additional controls at any time to remain compliant.",
          "5.4 We may modify, condition or discontinue any feature to comply with law, Card-Network rules or Payment-Processor requirements, including by removing or refusing any content or payment method."
        ]
      },
      {
        "h": "6. Identity and Age Verification",
        "p": [
          "6.1 Before we train any Model, generate any content, or process any payout for you, you must complete identity and age verification. At a minimum this requires a valid government-issued photographic identification document and a live \"liveness\" capture (a real-time selfie or short video) used to confirm that you are the person shown on that document and that you match the Training Material.",
          "6.2 Verification may be performed by us and/or by a third-party identity-verification vendor. You consent to the collection, processing and, where required by law or Card-Network rules, the retention of your identification documents and verification results for compliance and recordkeeping purposes.",
          "6.3 You represent that all identification and verification information you provide is true, current and belongs to you. Presenting another person's identity document, a forged or altered document, or another person's likeness is grounds for immediate termination and may be reported to law enforcement.",
          "6.4 We may re-verify your identity and age at any time and may suspend training, generation or payouts until re-verification is complete. We may refuse or revoke verification where we cannot reasonably confirm your identity or age.",
          "6.5 Verification is a condition of, and is a consent separate from, the biometric and content licenses described in Sections 7 and 11."
        ]
      },
      {
        "h": "7. AI Likeness License Grant",
        "p": [
          "7.1 To operate the Service you must grant, and by uploading Training Material and instructing us to train a Model you do grant, LetShoot a license to use your Likeness and Training Material solely to provide the Service to you. This includes ingesting, processing and analyzing your Training Material, deriving Biometric Data and model weights, training and storing your Model, and generating Generated Content at your direction.",
          "7.2 The license you grant is: (a) limited, and for the sole purpose of providing the Service to you and complying with law; (b) non-exclusive; (c) revocable by you as described in Section 16; (d) non-assignable and non-sublicensable by us, except to our service providers (such as hosting, compute and identity-verification vendors) acting on our behalf under confidentiality and data-protection obligations, and except as required to comply with law; and (e) limited in duration to the shorter of the life of your account plus any legally mandated recordkeeping period, or ten (10) years from the date each item is provided, after which the license expires unless you renew it.",
          "7.3 We do not acquire ownership of your Likeness, your Training Material or your Generated Content. We will not use your Likeness or Model to generate content for any other user, to create a \"shared,\" \"composite\" or \"marketplace\" model, or for advertising, promotion or model training for unrelated purposes, without your separate, specific, written opt-in consent, which you may decline or later withdraw.",
          "7.4 We may use de-identified, aggregated technical data that does not reproduce your Likeness to operate, secure and improve the Service.",
          "7.5 This license does not authorize us to publish or distribute your Generated Content to the public; distribution is your responsibility and choice, subject to Sections 12 through 18."
        ]
      },
      {
        "h": "8. Creator Ownership and Right of Publicity",
        "p": [
          "8.1 As between you and LetShoot, you own your Likeness, your right of publicity, your Training Material, and, subject to the licenses in these Terms and to any third-party tool licenses disclosed to you, the Generated Content produced from your Model.",
          "8.2 Nothing in these Terms transfers your right of publicity or your privacy rights to us. The license in Section 7 is neither a sale nor an assignment of those rights.",
          "8.3 You are responsible for how you exploit your Generated Content, including any agreements you make with adult platforms, fans or third parties, and for paying any taxes on your earnings.",
          "8.4 To the extent any jurisdiction treats model weights or Biometric Data as separately owned property, you and we agree that such weights and Biometric Data are held by us only as a processor and custodian, for the limited purposes stated in these Terms, and are subject to your withdrawal and deletion rights in Section 16."
        ]
      },
      {
        "h": "9. Only-Your-Own-Likeness; No Third-Party Likeness",
        "p": [
          "9.1 The Service may be used only to create and generate content depicting your own verified Likeness. This is the single most important rule of the Service.",
          "9.2 You must not upload, train on, or attempt to generate content depicting any person other than yourself, including any current or former partner, any celebrity or public figure, any fictional-but-real-looking composite of another identifiable person, or any person who has not personally completed verification and granted consent through the Service.",
          "9.3 You must not upload any image or video in which another real, identifiable person appears in a manner that could reproduce that person's Likeness in a Model or in Generated Content.",
          "9.4 Content that depicts, or that a reasonable reviewer could believe depicts, an identifiable third party without that party's verified consent is prohibited, will be blocked or removed, and may be reported.",
          "9.5 Each Creator's Likeness may be trained and used only under that Creator's own verified account and consent. Two or more people who wish to appear together must each be a verified Creator and must each grant consent for the specific content; we may require additional documentation for any multi-person content.",
          "9.6 Violation of this Section is a material breach and is grounds for immediate termination, forfeiture of the offending content, and referral to the authorities where the content is unlawful (including NCII or CSAM)."
        ]
      },
      {
        "h": "10. Authorized Users and Agency Delegation",
        "p": [
          "10.1 A Creator may authorize one or more individuals or an agency (\"Authorized Users\") to operate the Creator's account for day-to-day tasks such as uploading approved Training Material of the Creator, requesting generations, organizing content, and managing publication to third-party platforms, to the extent the Creator enables those permissions.",
          "10.2 The Creator remains fully responsible for all activity under the account, including all acts and omissions of Authorized Users, and for ensuring that Authorized Users comply with these Terms.",
          "10.3 An Authorized User or agency may not grant, expand, transfer or withdraw the Creator's biometric consent or Likeness consent. Consent to biometric processing, model training and the AI Likeness License may be given or withdrawn only by the Creator personally, through the Creator's verified identity, and may never be delegated. Any purported consent, license grant or withdrawal submitted by an Authorized User in place of the Creator is void.",
          "10.4 An agency must have a written agreement with the Creator authorizing its role. We may require evidence of that authority, and we may suspend or remove any Authorized User at the Creator's request or where we reasonably believe the arrangement is being abused, is non-consensual, or violates these Terms or law.",
          "10.5 The Creator may revoke any Authorized User's access at any time. Revocation does not relieve the Creator of responsibility for acts that occurred while access was granted."
        ]
      },
      {
        "h": "11. Biometric Data: Consent, Retention and Destruction",
        "p": [
          "11.1 To train and operate your Model, the Service collects and processes Biometric Data derived from your Training Material and liveness capture, including facial-geometry templates and other biometric identifiers and biometric information. This is a \"biometric identifier\"/\"biometric information\" under the Illinois Biometric Information Privacy Act (BIPA) and comparable laws, and a \"special category\" of personal data under Article 9 of the EU/UK GDPR.",
          "11.2 Purpose and consent. We collect and use your Biometric Data for the sole purposes of verifying your identity and age, training and operating your Likeness Model, generating content at your direction, and complying with law and Card-Network rules. Before any collection, you must review our Biometric Data Policy and provide a written release / explicit consent (which may be given electronically). You are not required to consent, but without consent we cannot provide the core Service.",
          "11.3 No sale or unrelated disclosure. We do not sell, lease, trade or otherwise profit from your Biometric Data, and we do not disclose it except: to service providers acting on our behalf under written confidentiality and data-protection terms; as you direct; or as required by law, valid legal process, or Card-Network compliance.",
          "11.4 Retention schedule. We retain your Biometric Data only as long as needed for the purposes above and, in any event, no longer than the earliest of: (a) satisfaction of the purpose for which it was collected; (b) three (3) years after your last interaction with the Service; or (c) the point at which you withdraw consent or delete your Model under Section 16. Records we are legally required to keep under Section 13 are held separately and only for the mandated period.",
          "11.5 Destruction. Upon expiry of the retention period, upon your withdrawal of consent, or upon deletion of your Model, we will permanently destroy your Biometric Data and the Model weights that embody your Likeness, and will instruct our processors to do the same, except for any data we are legally required to retain, which we will isolate, restrict from further processing, and destroy when the legal obligation ends.",
          "11.6 Your rights. Depending on where you live, you may have rights to access, correct, delete, port or restrict processing of your Biometric Data and other personal data, and to withdraw consent, as described in the Privacy Policy. Withdrawing biometric consent will stop further training and generation and will trigger deletion under Section 16.",
          "11.7 Security. We implement technical and organizational safeguards designed to protect Biometric Data using the reasonable standard of care in our industry, and no less than the care we use for our own confidential information."
        ]
      },
      {
        "h": "12. AI-Generated Content Disclosure and Provenance",
        "p": [
          "12.1 All Generated Content is artificial-intelligence-generated content depicting the Creator's AI Likeness Model; it is not an unaltered photographic recording of a live event. You acknowledge this and agree to represent the nature of the content truthfully.",
          "12.2 We apply provenance and disclosure measures to Generated Content, which may include visible labels, embedded metadata (such as C2PA content-credential signals), and/or invisible or visible watermarks indicating that the content is AI-generated. These measures support Card-Network rules, emerging AI-labeling laws, and NCII/deepfake detection.",
          "12.3 You must not remove, alter, obscure or defeat any provenance label, watermark, metadata or content credential we apply, and you must not misrepresent Generated Content as a candid or unmodified photograph or video of a real event where doing so is deceptive or unlawful.",
          "12.4 Where you publish Generated Content on third-party platforms, you are responsible for complying with those platforms' AI-disclosure rules and with any applicable AI-transparency or synthetic-media disclosure laws in the jurisdictions where the content is offered.",
          "12.5 We may refuse to deliver, or may re-process, any Generated Content whose provenance signals have been stripped or that cannot be reliably labeled."
        ]
      },
      {
        "h": "13. Recordkeeping (18 U.S.C. §§ 2257 / 2257A); Producer Status; Custodian of Records",
        "p": [
          "13.1 The Service produces visual depictions of actual, verified adults engaged in actual or simulated sexually explicit conduct. For the Generated Content produced through the Service, LetShoot acts as a \"producer\" within the meaning of 18 U.S.C. §§ 2257 and 2257A and 28 C.F.R. Part 75, and maintains the records those provisions require.",
          "13.2 To that end, we collect and keep for each verified Creator the records required by law, which may include the Creator's legal name and any known aliases or stage names, date of birth, a copy of the government-issued photo identification used for verification, and the verification and consent records associated with the Creator's Training Material and Generated Content.",
          "13.3 Custodian of Records. The Custodian of Records for materials produced through the Service is «[TO BE SET: Custodian of Records — full legal name and physical U.S. street address (not a P.O. box) where the 2257 Records are maintained and available for inspection]». The statutorily required recordkeeping and disclosure statement, including the Custodian's name and address, is published in our 2257 Compliance Statement.",
          "13.4 You agree to provide accurate information for these records, to cooperate with our verification, and to keep your information current. You acknowledge that we may be required to produce these records to authorized inspectors, and that we will retain them for the period required by law even after your account closes or your Model is deleted.",
          "13.5 To the extent you also publish or distribute Generated Content yourself, you may have your own independent recordkeeping or labeling obligations; nothing here relieves you of obligations that apply to you as a distributor."
        ]
      },
      {
        "h": "14. Acceptable Use and Prohibited Content; CSAM Zero Tolerance",
        "p": [
          "14.1 You must comply with our Acceptable Use Policy at all times. The prohibitions below are material terms of these Terms.",
          "14.2 Zero tolerance for CSAM. You must never upload, request, generate, store, transmit or distribute any material that depicts, appears to depict, or sexualizes a minor, including any real, fictional, \"age-play,\" de-aged, \"teen\"-themed, or AI-generated depiction that appears to be of a person under 18. This is prohibited without exception. We use detection tooling and human review, and we report apparent child sexual abuse material to the National Center for Missing & Exploited Children (NCMEC) and, as required, to law enforcement, and we preserve related data as the law requires. Offenders will be terminated immediately.",
          "14.3 No third-party or non-consensual likeness. You must not create content of anyone but your verified self (Section 9), and you must not create or distribute non-consensual intimate imagery or deepfakes of any real person (Section 18).",
          "14.4 Other prohibited content and conduct include, without limitation: non-consensual sexual content; content depicting or promoting rape, incest with real relatives, bestiality, necrophilia, or serious non-consensual violence, torture or gore; content depicting trafficking or coercion; sexual content involving persons who cannot consent; use of another person's identity documents or Likeness; circumventing verification, provenance or safety controls; uploading malware; scraping or unauthorized automated access; infringing others' intellectual-property rights; and any use that violates law or Card-Network rules.",
          "14.5 Prohibited content is subject to blocking, removal, preservation, reporting and account termination. Certain categories (CSAM, NCII, trafficking) will be reported to the appropriate authorities regardless of your stated intent.",
          "14.6 We may update the list of prohibited content to meet legal and Card-Network requirements, and such updates take effect when posted."
        ]
      },
      {
        "h": "15. Content Review Prior to Publication or Delivery",
        "p": [
          "15.1 As required by Card-Network rules and our compliance program, Generated Content and, where applicable, Training Material are subject to review before the content is delivered to you for distribution or made available for publication.",
          "15.2 Review may combine automated screening (for CSAM, third-party likeness, non-consent signals and prohibited categories) with human moderation. We may delay, withhold, watermark, edit the metadata of, or refuse any content that fails review.",
          "15.3 Review is a safety and compliance control for the benefit of affected persons and the payment ecosystem. It does not make us the publisher of your Generated Content, does not guarantee that content is lawful in every jurisdiction, and does not shift to us your responsibility for lawful distribution.",
          "15.4 You must not attempt to bypass review, or to publish or distribute content that has not cleared review where clearance is required."
        ]
      },
      {
        "h": "16. Withdrawal of Consent and Model Deletion",
        "p": [
          "16.1 You may withdraw your biometric and Likeness consent and request deletion of your Model at any time, through your account settings or by contacting us at soporte@letshoot.ai. Only the Creator, through verified identity, may do this (Section 10.3).",
          "16.2 Upon a valid withdrawal or deletion request, we will, within a commercially reasonable time and no later than «[TO BE SET: deletion turnaround, e.g., 30 days]»: stop training and generating with your Model; deactivate and then permanently delete your Model weights and Biometric Data; and instruct our processors to do the same.",
          "16.3 Deletion is subject to the legally mandated retention in Section 13 (2257 Records) and to any records we must keep to comply with law, resolve disputes or enforce our agreements. Such retained records will be restricted from further processing and destroyed when the obligation ends.",
          "16.4 Withdrawal and deletion do not affect: (a) Generated Content you have already downloaded, published or distributed; (b) copies lawfully held by third parties to whom you distributed content; or (c) the lawfulness of processing carried out before withdrawal. You are responsible for removing content you have already published from third-party platforms.",
          "16.5 Deleting your Model may end your ability to use core features and may result in closure of your account."
        ]
      },
      {
        "h": "17. Complaints, Appeals and Content Removal",
        "p": [
          "17.1 We maintain a complaints and content-removal process, available to Creators, to persons depicted in content, and to third parties, at soporte@letshoot.ai and through any reporting tools we provide.",
          "17.2 Anyone may report content they believe violates these Terms or their rights, including content they believe depicts them without consent, infringes their rights, or is otherwise unlawful. Reports should identify the content, the basis for the complaint, and the reporter's relationship to it.",
          "17.3 We will acknowledge and review complaints and will resolve them — including by removing or restricting content where warranted — within seven (7) business days of receiving a complete report, except that NCII/deepfake reports are handled on the accelerated timeline in Section 18 and CSAM is actioned immediately.",
          "17.4 Appeals. A Creator whose content was removed or restricted, and a complainant dissatisfied with our decision, may appeal by replying to our decision within the time we specify. We will review appeals in good faith and communicate the outcome. Certain removals required by law or Card-Network rules are not reversible.",
          "17.5 We keep records of complaints, actions and appeals, and may report aggregate information to our acquirers and, where required, to the authorities."
        ]
      },
      {
        "h": "18. Non-Consensual Intimate Imagery and Deepfakes (TAKE IT DOWN Act)",
        "p": [
          "18.1 Consistent with the federal TAKE IT DOWN Act and comparable laws, we prohibit non-consensual intimate imagery (NCII) and non-consensual sexual \"deepfakes,\" whether authentic or computer-generated, of any identifiable person.",
          "18.2 Notice and removal. An identifiable individual (or someone authorized to act on their behalf) who believes intimate visual depictions of them are available through the Service without consent may submit a removal request to our designated contact at «[TO BE SET: NCII removal contact / designated agent — email and mailing address]». A valid request should include: a signed statement (physical or electronic) that the requester is the depicted individual or an authorized representative and that the depiction was made, or is being made available, without consent; information reasonably sufficient to locate the content; and contact information.",
          "18.3 Upon receiving a valid request, we will remove the reported intimate visual depiction, and will make reasonable efforts to identify and remove any known identical copies, as soon as possible and no later than forty-eight (48) hours after receipt.",
          "18.4 We may use hash-matching and other tooling to detect and prevent re-upload of removed NCII. We will not treat a good-faith takedown as an admission, and we may preserve evidence as the law allows or requires.",
          "18.5 Misuse of this process (for example, submitting a false consent claim, or falsely claiming that content is non-consensual) is prohibited and may itself violate these Terms and the law.",
          "18.6 This process is in addition to the copyright process in Section 19 and the general complaints process in Section 17."
        ]
      },
      {
        "h": "19. Copyright, DMCA and Intellectual Property",
        "p": [
          "19.1 You must respect others' intellectual-property rights and may upload only material that you own or are licensed to use. You represent that your Training Material and instructions do not infringe any third party's copyright, trademark, right of publicity or other rights.",
          "19.2 We respond to notices of alleged copyright infringement under the Digital Millennium Copyright Act (DMCA). If you believe content on the Service infringes your copyright, send a notice containing the elements required by 17 U.S.C. § 512(c)(3) to our designated agent: «[TO BE SET: DMCA Designated Agent — name, mailing address, email and telephone, as registered with the U.S. Copyright Office]».",
          "19.3 We will remove or disable access to allegedly infringing content, notify the affected user, and accept counter-notifications as provided by the DMCA. We maintain and enforce a policy of terminating, in appropriate circumstances, users who are repeat infringers.",
          "19.4 The Service — including our software, models (other than your Likeness Model weights), user interfaces, trademarks and content we provide — is owned by us or our licensors and is protected by intellectual-property laws. We grant you a limited, revocable, non-exclusive, non-transferable license to use the Service for its intended purpose during your subscription; you receive no other rights.",
          "19.5 The Service may incorporate third-party AI models or tools under their own licenses; where those licenses impose conditions on outputs, we will disclose the material terms, and you agree to comply with them."
        ]
      },
      {
        "h": "20. Billing, Subscriptions, Refunds and Chargebacks",
        "p": [
          "20.1 Paid features are offered on subscription and/or usage/credit terms described at purchase, with prices ranging generally from «[TO BE SET: price range, e.g., US$200–US$1,000]» depending on the plan. All fees are stated in the currency shown and are exclusive of taxes unless otherwise stated.",
          "20.2 Payments are processed by our third-party Payment Processors, CCBill and/or Epoch, using Visa or Mastercard. Your charges will appear on your statement under the descriptor «[TO BE SET: billing descriptor as registered with the processor]». Your use of the Payment Processor is also subject to its own terms and privacy policy.",
          "20.3 Subscriptions renew automatically for successive periods until cancelled. You may cancel at any time through your account or the Payment Processor's tools; cancellation stops future renewals and takes effect at the end of the current period.",
          "20.4 Refunds. Except where required by law or expressly stated in our Refund Policy, fees are non-refundable, including fees for training runs, credits or generations already consumed. We may, at our discretion, grant partial or full refunds (for example, for verified technical failures). Consumers in some jurisdictions (including the EU/UK) may have statutory withdrawal or cancellation rights, which we honor where they apply; digital services begun with your consent before the withdrawal period ends may reduce or remove those rights to the extent the law allows.",
          "20.5 Chargebacks. If you have a billing concern, contact us first at soporte@letshoot.ai; we aim to resolve disputes promptly. Initiating a chargeback or payment dispute without first contacting us, or for services actually rendered, is a breach of these Terms; we may suspend your account, contest the chargeback with evidence of your acceptance and use, and recover related fees and costs.",
          "20.6 We may change prices and plans on notice; changes apply to the next billing cycle. Failure to pay may result in suspension or termination and loss of access to features and stored content, subject to the retention rules above."
        ]
      },
      {
        "h": "21. Identity Verification, AML, Sanctions and Payouts",
        "p": [
          "21.1 In addition to Section 6, we and our Payment Processors apply \"know-your-customer\" (KYC) and anti-money-laundering (AML) controls. You agree to provide the identity, business, tax and banking information reasonably required to verify you and to pay you, and to keep it accurate.",
          "21.2 Sanctions. You represent that you are not located in, ordinarily resident in, or acting on behalf of any person in a country or territory subject to comprehensive U.S. or other applicable sanctions, and that you are not on any applicable sanctions or denied-parties list. We do not provide the Service to sanctioned persons and will refuse or reverse transactions as required.",
          "21.3 Payouts. Where the Service facilitates payouts to you (for example, of amounts collected on your behalf), payouts are subject to verification, minimum thresholds, holdback or reserve periods for chargeback and fraud risk, and any deductions for fees, taxes, refunds, or amounts you owe us. We may withhold or delay payouts pending verification, investigation of suspected fraud or prohibited content, or legal process.",
          "21.4 You are solely responsible for your own tax obligations, and we may issue tax forms and withhold amounts where required by law.",
          "21.5 We may report suspicious activity as required and cooperate with lawful requests from regulators, Card Networks and law enforcement."
        ]
      },
      {
        "h": "22. Disclaimers of Warranties",
        "p": [
          "22.1 The Service is provided \"as is\" and \"as available,\" without warranties of any kind, whether express, implied or statutory, including implied warranties of merchantability, fitness for a particular purpose, title and non-infringement, to the fullest extent permitted by law.",
          "22.2 We do not warrant that the Service will be uninterrupted, secure or error-free, that AI outputs will be accurate, realistic, consistent or fit for your purpose, that content will be free of flaws, or that provenance or safety tooling will detect every prohibited item.",
          "22.3 AI-generated outputs are probabilistic and may contain artifacts or unexpected results. You are responsible for reviewing Generated Content before use and for deciding whether and how to distribute it.",
          "22.4 We are not your lawyer, agent or tax advisor, and nothing in the Service is legal, tax or financial advice. You are responsible for your own compliance with the laws and platform rules that apply to your distribution and sale of content.",
          "22.5 Some jurisdictions do not allow certain warranty exclusions, so parts of the above may not apply to you; in that case, warranties are limited to the minimum scope and duration the law requires."
        ]
      },
      {
        "h": "23. Limitation of Liability",
        "p": [
          "23.1 To the fullest extent permitted by law, neither LetShoot / ASM Media Group nor its officers, employees, agents, licensors or service providers will be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for lost profits, revenue, goodwill, data or content, arising out of or relating to the Service, even if advised of the possibility of such damages.",
          "23.2 To the fullest extent permitted by law, our total aggregate liability for all claims relating to the Service will not exceed the greater of the amount you paid us for the Service in the six (6) months before the event giving rise to the claim, or «[TO BE SET: liability floor, e.g., US$100]».",
          "23.3 The limitations in this Section apply to all theories of liability and are a fundamental basis of the bargain between us. They do not apply to liability that cannot be limited by law (for example, certain statutory consumer rights, or liability for gross negligence, fraud or willful misconduct where non-waivable).",
          "23.4 Nothing in these Terms limits either party's liability for its own violation of law regarding CSAM or NCII, or for a person's non-waivable statutory rights, including biometric-privacy and right-of-publicity claims to the extent such limitation is prohibited."
        ]
      },
      {
        "h": "24. Indemnification",
        "p": [
          "24.1 You will defend, indemnify and hold harmless LetShoot / ASM Media Group and its officers, employees, agents, licensors and service providers from and against any claims, demands, liabilities, damages, losses and costs (including reasonable legal fees) arising out of or relating to: (a) your Creator Content, including any claim that it depicts a third party, is non-consensual, is unlawful, or infringes rights; (b) your breach of these Terms or of law or Card-Network rules; (c) your distribution, sale or marketing of Generated Content; (d) the acts or omissions of your Authorized Users or agency; and (e) any misrepresentation of your identity, age or authority.",
          "24.2 We will notify you of a claim, allow you to control the defense with counsel reasonably acceptable to us, and cooperate reasonably; we may participate with our own counsel at our expense. You may not settle a claim in a way that imposes obligations on us or admits our fault without our written consent.",
          "24.3 Your indemnification obligations survive termination of these Terms."
        ]
      },
      {
        "h": "25. Suspension and Termination",
        "p": [
          "25.1 You may stop using the Service and close your account at any time, subject to the deletion and retention rules above.",
          "25.2 We may suspend or terminate your access, in whole or in part, with or without notice, if: you breach these Terms; we reasonably suspect prohibited content (including CSAM, NCII or third-party likeness), fraud, or chargeback abuse; verification fails or cannot be maintained; a Card Network, Payment Processor or law requires it; or continued provision poses legal, security or reputational risk.",
          "25.3 For serious violations (including CSAM, NCII or third-party-likeness violations), termination may be immediate and permanent, content may be preserved and reported, and we may decline to restore access or data.",
          "25.4 On termination, we will cease providing the Service and will handle your Biometric Data, Model and content in accordance with Sections 11, 13 and 16 (deletion subject to legally mandated retention).",
          "25.5 Provisions that by their nature should survive termination — including ownership, licenses granted to us for the limited compliance/retention period, recordkeeping, disclaimers, limitation of liability, indemnification and dispute resolution — survive."
        ]
      },
      {
        "h": "26. Governing Law, Dispute Resolution, Arbitration and Class-Action Waiver",
        "p": [
          "26.1 These Terms are governed by the laws of the State of «[TO BE SET: governing-law U.S. state]» and applicable U.S. federal law, without regard to conflict-of-laws rules, except that mandatory consumer-protection and data-protection laws of your place of residence may also apply and are not waived by this Section.",
          "26.2 Informal resolution. Before starting any formal proceeding, you agree to contact us at soporte@letshoot.ai and to attempt to resolve the dispute informally for at least thirty (30) days.",
          "26.3 Arbitration. Except for the carve-outs below, any dispute arising out of or relating to these Terms or the Service will be resolved by final and binding individual arbitration administered by «[TO BE SET: arbitration provider and applicable rules]», seated in «[TO BE SET: arbitration seat/venue]», conducted in English or Spanish at the claimant's election. Judgment on the award may be entered in any court of competent jurisdiction.",
          "26.4 Class-action waiver. To the fullest extent permitted by law, disputes will be brought only in an individual capacity, and not as a plaintiff or class member in any purported class, collective, consolidated or representative proceeding. The arbitrator may not consolidate more than one person's claims or preside over any representative or class proceeding.",
          "26.5 Right-of-publicity and non-waivable carve-out. Notwithstanding the foregoing: (a) claims relating to your own right of publicity, your biometric-privacy rights, or other non-waivable statutory rights may be brought as the applicable law permits and are not waived, limited, or forced into arbitration to the extent that law prohibits; (b) either party may bring an individual claim in small-claims court; and (c) either party may seek injunctive relief in court to stop infringement or misuse of intellectual-property or publicity rights, or unauthorized disclosure. Where arbitration or the class waiver is unenforceable for a claim, that claim proceeds in the courts of «[TO BE SET: judicial venue]», and the remainder of this Section still applies to other claims.",
          "26.6 Consumers in the EU/UK and certain other jurisdictions retain the right to bring proceedings in, and to the protection of the mandatory laws of, their home jurisdiction; nothing in this Section removes those rights."
        ]
      },
      {
        "h": "27. Changes to the Terms; Contact; Designated Agents; Miscellaneous",
        "p": [
          "27.1 Changes. We may update these Terms to reflect changes in the Service, in law or in Card-Network rules. We will post the updated Terms with a new effective date and, for material changes, provide reasonable notice (for example, by email or in-product notice). Changes are not retroactive and take effect on the stated date; your continued use after that date constitutes acceptance. If you do not agree, you must stop using the Service before the effective date.",
          "27.2 Contact and designated agents. Operator: ASM Media Group LLC, operating as LetShoot (letshoot.ai). General and support contact: soporte@letshoot.ai. Custodian of Records: see Section 13.3 and our 2257 Compliance Statement. DMCA Designated Agent: see Section 19.2. NCII removal contact: see Section 18.2. Data-protection representatives under GDPR Article 27: EU — «[TO BE SET: EU Article 27 representative name and address]»; UK — «[TO BE SET: UK Article 27 representative name and address]».",
          "27.3 Entire agreement; order of precedence. These Terms, together with the policies and supplemental terms incorporated by reference, are the entire agreement between you and us regarding the Service, and supersede prior agreements on the subject.",
          "27.4 Severability; no waiver. If any provision is held unenforceable, the remainder remains in effect and the provision is modified to the minimum extent necessary. Our failure to enforce any provision is not a waiver of it.",
          "27.5 Assignment. You may not assign these Terms without our consent; we may assign them to an affiliate or successor (for example, in a merger or sale), subject to the biometric and Likeness protections in these Terms and applicable law.",
          "27.6 Force majeure. We are not liable for delays or failures caused by events beyond our reasonable control.",
          "27.7 Language. These Terms are provided in Spanish and English; in case of conflict, the «[TO BE SET: controlling language]» version controls, except where local law requires the local-language version to prevail.",
          "27.8 Notices. We may give notices by email or through the Service; you consent to electronic communications and records."
        ]
      }
    ]
  }
};

export default function TermsPage() {
  const l = useLegalLang();
  const c = C[l] || C.en;
  return (
    <LegalPage title={c.title}>
      {c.s.map((sec, i) => (
        <Section key={i} h={sec.h}>
          {sec.p.map((para, j) => <p key={j}>{para}</p>)}
        </Section>
      ))}
    </LegalPage>
  );
}
