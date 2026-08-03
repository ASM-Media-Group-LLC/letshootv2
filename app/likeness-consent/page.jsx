'use client';

// Auto-assembled legal page. DRAFT — must be reviewed by an attorney before publishing.
// Bilingual ES/EN via useLegalLang(). Placeholders marked [POR DEFINIR / TO BE SET].
import LegalPage, { Section, useLegalLang } from '@/components/LegalPage';

const C = {
  "es": {
    "title": "Licencia de Imagen con IA y Consentimiento de Clon Digital",
    "s": [
      {
        "h": "1. Partes, objeto y cómo leer este acuerdo",
        "p": [
          "Este Acuerdo de Licencia de Imagen con IA y Consentimiento de Clon Digital (el \"Acuerdo\") se celebra entre tú, la persona creadora de contenido identificada en el bloque de firma electrónica al final (\"tú\", \"tu\" o la \"Creadora/Creador\"), y ASM Media Group LLC, operadora de letshoot.ai (\"nosotros\", \"la Operadora\" o \"LetShoot\"). Este Acuerdo es el instrumento central e independiente mediante el cual autorizas la creación y operación de un modelo de inteligencia artificial de tu propia imagen y la generación de contenido a partir de él.",
          "Este Acuerdo complementa, y se incorpora por referencia a, los Términos de servicio y la Política de privacidad de LetShoot. En caso de conflicto directo específicamente sobre la creación, entrenamiento, operación, revocación o eliminación de tu Clon Digital, o tu consentimiento a contenido sexualmente explícito, prevalece este Acuerdo; en todo lo demás prevalecen los Términos de servicio.",
          "Este Acuerdo entra en vigor únicamente cuando completas la firma electrónica descrita en la Sección 23 y solo después de que tu identidad y edad hayan sido verificadas conforme a la Sección 6. Hasta entonces, no se creará ni operará ningún Clon Digital tuyo. Este documento es un borrador interno preparado para su revisión por el abogado de la Operadora; no constituye asesoría legal para ti."
        ]
      },
      {
        "h": "2. Definiciones",
        "p": [
          "\"Imagen\" significa tu rostro, cuerpo, voz, características físicas, gestos y cualquier otro atributo personal por el que seas identificable, junto con las fotografías y videos de ti misma/o que proporcionas.",
          "\"Datos de Entrenamiento\" significa las fotografías, videos y material relacionado de ti misma/o que subes para que construyamos tu modelo, junto con las características técnicas y la geometría facial/corporal que derivamos de ese material.",
          "\"Clon Digital\" o \"Modelo LoRA\" significa el conjunto ajustado de parámetros de aprendizaje automático (una adaptación de bajo rango, o \"LoRA\", y cualquier embedding, checkpoint o configuración asociada) que entrenamos a partir de tus Datos de Entrenamiento y que puede generar nuevas imágenes y videos sintéticos que se te parecen.",
          "\"Contenido Generado\" significa las fotografías y videos sintéticos producidos al operar tu Clon Digital según tus instrucciones.",
          "\"Contenido Sexualmente Explícito\" significa Contenido Generado que muestra desnudez, conducta sexual o poses sexualmente explícitas de tu Imagen, conforme al consentimiento adicional de la Sección 8.",
          "\"Crear\" significa generar y entregarte Contenido Generado (y, si lo autorizaste por separado, a tu Agencia). \"Publicar\" significa poner el Contenido Generado a disposición del público o distribuirlo en plataformas de terceros.",
          "\"Datos Biométricos\" significa los identificadores e información biométrica derivados de tu Imagen, incluida la geometría facial, y constituyen datos de \"categoría especial\" bajo el RGPD e \"información biométrica\" bajo leyes como la Ley de Privacidad de Información Biométrica de Illinois (BIPA).",
          "\"Agencia\" significa cualquier agencia de talento, mánager o tercero al que hayas autorizado por separado a recibir o gestionar tu Contenido Generado. \"Registros de Conservación Legal\" tiene el significado de la Sección 14."
        ]
      },
      {
        "h": "3. Qué es el Clon Digital (Modelo LoRA)",
        "p": [
          "Tu Clon Digital es un modelo estadístico, no una biblioteca de tus fotografías ni una grabación de ningún hecho real. Durante el entrenamiento, nuestro sistema aprende patrones numéricos de tus Datos de Entrenamiento y los codifica en un conjunto compacto de pesos de modelo (el LoRA). Al operarse, el modelo sintetiza imágenes y videos nuevos que se te parecen pero que representan escenas, poses y situaciones que nunca ocurrieron físicamente.",
          "Cada Clon Digital está aislado y es solo tuyo. Se entrena únicamente con Datos de Entrenamiento tuyos, se usa únicamente para generar contenido tuyo según tus instrucciones y nunca se combina, mezcla ni entrena con la imagen de otra persona para tu modelo, ni se usa para generar contenido para otro cliente. No usamos tu Clon Digital para entrenar ni mejorar ningún modelo general o compartido, y no lo vendemos.",
          "Como el Clon Digital se deriva de tus Datos Biométricos, tratamos los propios pesos del modelo como datos personales que te pertenecen a efectos de conservación, seguridad y eliminación conforme a las Secciones 7 y 14. El Clon Digital se almacena con controles de acceso, cifrado en tránsito y en reposo, y registro de actividad acordes a su sensibilidad."
        ]
      },
      {
        "h": "4. Otorgamiento de la licencia — alcance, no exclusividad, plazo (máximo 10 años)",
        "p": [
          "Sujeto a los términos de este Acuerdo, otorgas a la Operadora una licencia limitada, no exclusiva, revocable, intransferible y no sublicenciable (salvo a nuestros subencargados estrictamente para operar el Servicio en nuestro nombre) para: (a) recibir, almacenar y procesar tus Datos de Entrenamiento; (b) crear, entrenar, ajustar, almacenar, alojar y operar tu Clon Digital; y (c) generar, almacenar y entregar Contenido Generado que represente tu propia Imagen, en cada caso únicamente para prestarte el Servicio.",
          "Esta licencia es no exclusiva. Conservas todos los derechos sobre tu propia Imagen y puedes autorizar, licenciar o explotar tu Imagen en otros lugares y por cualquier otro medio en cualquier momento. Nada en este Acuerdo cede a nosotros tu Imagen ni tus derechos de personalidad o de imagen.",
          "Esta licencia se otorga por un plazo que comienza en la fecha de entrada en vigor y termina en el primero de estos supuestos: (i) tu revocación del consentimiento conforme a la Sección 14; (ii) la terminación o cierre de tu cuenta; o (iii) el décimo (10.º) aniversario de la fecha de entrada en vigor. En el décimo aniversario la licencia expira automáticamente; para continuar el Servicio después de esa fecha deberás firmar una nueva versión vigente de este consentimiento. No trataremos el silencio ni el pago continuado como renovación de una licencia de imagen expirada.",
          "La licencia se limita estrictamente a los fines anteriores. Cualquier uso de tu Clon Digital, Datos de Entrenamiento o Contenido Generado más allá de esos fines queda fuera del alcance de esta licencia y requiere tu consentimiento específico por separado."
        ]
      },
      {
        "h": "5. Solo tu propia imagen",
        "p": [
          "Puedes autorizar un Clon Digital de ti misma/o y de nadie más. Declaras y garantizas que eres el único sujeto humano de todos los Datos de Entrenamiento que proporcionas, que eres la persona representada y que no estás subiendo, clonando ni solicitando contenido basado en ninguna otra persona viva o fallecida, ningún compuesto de varias personas, ninguna celebridad o \"doble\", ningún personaje ficticio basado en un tercero real, ni ningún menor de edad.",
          "Clonar la imagen de otra persona —con o sin su permiso— está estrictamente prohibido en esta plataforma. Es una regla innegociable: LetShoot existe únicamente para que crees contenido de tu propia persona verificada.",
          "Verificamos los Datos de Entrenamiento y la actividad de la cuenta según esta regla. Si detectamos o sospechamos razonablemente que los Datos de Entrenamiento muestran a alguien que no eres tú, nos negaremos a construir o desactivaremos el Clon Digital, podremos suspender o terminar tu cuenta y, cuando el contenido o la conducta sean ilícitos, lo reportaremos a las autoridades competentes según las Secciones 10 y 16."
        ]
      },
      {
        "h": "6. Verificación de identidad y edad; declaración de sujeto único",
        "p": [
          "Antes de crear cualquier Clon Digital, debes completar la verificación de identidad y edad, incluida una identificación oficial con fotografía válida y un selfie en vivo o prueba de vida. Debes tener al menos 18 años (o la mayoría de edad de tu jurisdicción, si es mayor). Debemos poder cotejar razonablemente la identidad de tu documento, la persona de tus Datos de Entrenamiento y la persona titular de la cuenta.",
          "Declaras que la persona que aparece en tus documentos de verificación y en todos los Datos de Entrenamiento eres tú, y solo tú. Podemos volver a verificar tu identidad en cualquier momento, incluso antes de atender una solicitud de revocación conforme a la Sección 15, antes de crear una nueva versión del modelo y periódicamente según lo exija la ley o nuestros procesadores de pago.",
          "Proporcionar documentos de identidad falsos, prestados o alterados, o declarar falsamente ser el sujeto único, es un incumplimiento sustancial de este Acuerdo, dará lugar a la terminación inmediata y podrá ser reportado a las autoridades y a nuestros procesadores de pago."
        ]
      },
      {
        "h": "7. Datos biométricos — consentimiento explícito, conservación y destrucción (BIPA / RGPD art. 9)",
        "p": [
          "Consientes de manera expresa y específica en que recopilemos, almacenemos y usemos tus Datos Biométricos —incluida la geometría facial y corporal derivada de tus Datos de Entrenamiento— con el único y limitado fin de crear, entrenar, operar y (cuando lo autorices) mejorar tu propio Clon Digital y generar tu Contenido Generado. Este es tu consentimiento libre, informado y por escrito a efectos de BIPA y del artículo 9(2)(a) del RGPD (consentimiento explícito para tratar datos de categoría especial).",
          "No venderemos, arrendaremos, intercambiaremos ni obtendremos beneficio de tus Datos Biométricos, y no los divulgaremos salvo a los subencargados que alojan y ejecutan el Servicio en nuestro nombre bajo obligaciones escritas de confidencialidad y tratamiento de datos, o cuando la divulgación sea exigida por ley o para responder a un proceso legal válido.",
          "Conservamos tus Datos Biométricos y tu Clon Digital solo mientras tu licencia esté activa y esta conservación siga siendo necesaria para los fines anteriores, y en ningún caso más de «[POR DEFINIR: periodo máximo de conservación de datos biométricos, coherente con la pauta de BIPA de tres años desde la última interacción y el tope de licencia de 10 años]». Tras la revocación, expiración o cierre de cuenta, destruiremos de forma permanente tus Datos Biométricos y tu Clon Digital dentro de «[POR DEFINIR: plazo de destrucción posterior a la revocación, p. ej., 30 días]», salvo los Registros de Conservación Legal de la Sección 14.",
          "Mantenemos una política escrita y públicamente disponible de conservación y destrucción de datos biométricos, y destruiremos los Datos Biométricos conforme a esa política y a esta Sección. Destruir significa eliminar los pesos del modelo, las características biométricas derivadas y los Datos de Entrenamiento de los sistemas de producción y, en el ciclo de respaldo aplicable, de las copias de seguridad."
        ]
      },
      {
        "h": "8. Consentimiento explícito a contenido sexualmente explícito de tu imagen (RGPD art. 9(2)(a))",
        "p": [
          "Consientes de manera expresa, específica y libre en la creación de Contenido Sexualmente Explícito —incluidas fotografías y videos desnudos, sexuales y pornográficos— que representen tu propia Imagen, generados por tu Clon Digital según tus instrucciones. Entiendes la naturaleza explícita y para adultos de este contenido y confirmas que deseas que se produzca.",
          "Dado que el Contenido Sexualmente Explícito puede revelar o permitir inferencias sobre tu vida sexual u orientación sexual, se trata de datos de categoría especial bajo el artículo 9 del RGPD. Esta Sección es tu consentimiento explícito bajo el artículo 9(2)(a) para tratar dichos datos con el fin específico de generar tu Contenido Generado para adultos, y es independiente y adicional al consentimiento general de la Sección 4.",
          "Puedes establecer límites sobre las categorías, actos, vestuario, escenarios o situaciones que tu Clon Digital puede representar, y honraremos los límites razonables y lícitos que comuniques a través de la plataforma. Puedes retirar este consentimiento específico al Contenido Sexualmente Explícito en cualquier momento conforme a las Secciones 14 y 15 sin cerrar toda tu cuenta, en cuyo caso dejaremos de generar Contenido Sexualmente Explícito tuyo.",
          "Este consentimiento a contenido sexualmente explícito nunca prevalece sobre la Sección 10: ningún consentimiento que otorgues puede autorizar contenido ilícito, que represente a menores o a sujetos con apariencia de menores, o que represente a cualquier persona distinta de ti."
        ]
      },
      {
        "h": "9. Dos capas de consentimiento — crear vs. publicar",
        "p": [
          "Este Acuerdo distingue entre el consentimiento para Crear y el consentimiento para Publicar. Por defecto, tu consentimiento nos autoriza únicamente a Crear —es decir, a generar Contenido Generado y entregártelo (y, si lo autorizaste por separado en tu cuenta, a tu Agencia designada). Por defecto, no Publicamos ni distribuimos tu Contenido Generado al público en tu nombre.",
          "La publicación de tu Contenido Generado en plataformas de adultos, redes sociales u otros lugares es un acto distinto que tú (o tu Agencia autorizada) controlas y del que eres responsable. Si nuestro Servicio incluye alguna función para publicar en tu nombre, esa función requerirá tu consentimiento de Publicación específico y por separado, otorgado por campaña, por lote o por pieza según se configure, y revocable con independencia de tu consentimiento para Crear.",
          "Retirar el consentimiento de Publicación nos impide (y a cualquier función de publicación que hayas activado) seguir haciendo público el Contenido Generado y, cuando operamos un canal de distribución en tu nombre, hace que retiremos tu contenido de ese canal. Retirar el consentimiento de Publicación no puede, por sí solo, recuperar Contenido Generado que tú o un tercero ya hayan descargado, distribuido o publicado fuera de nuestro control; para ello se aplican los mecanismos de retirada de la Sección 16.",
          "Puedes exigir revisión y aprobación por lote o por pieza antes de que se finalice la Creación o, en su caso, antes de que ocurra la Publicación, y honraremos esa configuración cuando esté disponible."
        ]
      },
      {
        "h": "10. Límites de contenido y resultados prohibidos",
        "p": [
          "Ningún consentimiento de este Acuerdo autoriza, y nunca crearemos ni permitiremos a sabiendas, contenido ilícito. Mantenemos tolerancia cero con el material de abuso sexual infantil (CSAM) y con cualquier contenido que represente, o parezca representar, a un menor de forma sexual o explotadora, incluido cualquier intento de hacer que tu Clon Digital adulto aparente ser menor de edad. Todo intento de este tipo dará lugar a la terminación inmediata y a un reporte al National Center for Missing & Exploited Children (NCMEC) y a otras autoridades competentes, así como a la preservación de los registros correspondientes según lo exija la ley.",
          "También prohibimos el Contenido Generado que represente a cualquier persona identificable distinta de ti; imágenes íntimas no consentidas de cualquier persona; violencia real o realista, gore o actos no consentidos presentados como reales; y cualquier categoría prohibida por la ley aplicable o por las reglas de contenido para adultos de las redes de tarjetas referidas en la Sección 19.",
          "Puedes especificar escenarios adicionales que no deseas que tu Clon Digital represente, y los trataremos como prohibidos para tu modelo. Que hagamos cumplir estos límites no nos convierte en autores ni avaladores del contenido lícito que nos indiques Crear."
        ]
      },
      {
        "h": "11. Procedencia e identificación del contenido con IA",
        "p": [
          "Todo el Contenido Generado es material sintético generado por IA. Lo reconoces y aceptas que pueda ser identificado como tal. Cuando sea técnicamente posible, incorporamos información de procedencia en el Contenido Generado —por ejemplo, credenciales de contenido tipo C2PA, firmas criptográficas y/o marcas de agua visibles o invisibles— que indiquen que el contenido es generado por IA y producido por LetShoot.",
          "Aceptas no eliminar, alterar ni ocultar los metadatos de procedencia o las marcas de agua que apliquemos, y aceptas cumplir cualquier ley o regla de plataforma aplicable que exija revelar que el contenido es generado por IA o creado digitalmente, incluidas las leyes de transparencia de IA y de divulgación de medios sintéticos de las jurisdicciones donde publiques.",
          "La identificación de procedencia apoya el uso lícito, el cumplimiento de las plataformas y la protección frente al mal uso de tu Imagen. No es una garantía de que los terceros conserven la identificación una vez que el contenido salga de nuestros sistemas."
        ]
      },
      {
        "h": "12. La Operadora como custodio de registros y \"productor\" bajo 18 U.S.C. § 2257",
        "p": [
          "A efectos de los requisitos federales de EE. UU. de conservación de registros del 18 U.S.C. § 2257 y § 2257A y sus reglamentos, y en la medida en que dichos requisitos apliquen a las representaciones para adultos generadas por IA, la Operadora actúa como productor y custodio de registros respecto del Contenido Generado creado a través del Servicio. Mantenemos registros de verificación de edad, identidad y consentimiento de toda persona cuya Imagen se utiliza, incluida tú.",
          "Aceptas que la Operadora es la parte responsable de conservar estos registros, aceptas cooperar proporcionando y actualizando la información necesaria para ellos, y consientes en que conservemos estos registros como Registros de Conservación Legal conforme a la Sección 14 incluso después de eliminar tu Clon Digital.",
          "El custodio de registros y la dirección en EE. UU. donde se mantienen los registros son: «[POR DEFINIR: Custodio de Registros conforme a 18 U.S.C. § 2257 — nombre legal completo y dirección física en EE. UU. donde se conservan los registros]». Las solicitudes de inspección de registros pueden dirigirse a soporte@letshoot.ai."
        ]
      },
      {
        "h": "13. Carácter personal e indelegable de este consentimiento",
        "p": [
          "Este consentimiento es personal tuyo. Solo tú, la Creadora/Creador, puedes otorgarlo, modificarlo o retirarlo. Ninguna Agencia, mánager, agente, socio, cónyuge u otro tercero puede otorgar, firmar, alterar ni retirar este consentimiento en tu nombre, y no actuaremos sobre ninguna instrucción de ese tipo, aunque esa persona tenga un poder notarial o afirme gestionar tu carrera o tu contenido, salvo que la ley o un proceso legal válido nos obliguen.",
          "Si has autorizado a una Agencia a recibir o gestionar tu Contenido Generado, esa autorización se limita al manejo de contenido ya creado y no transfiere a la Agencia ningún poder sobre tu consentimiento de imagen subyacente, tus Datos Biométricos, tu Clon Digital ni tu derecho de revocación. La Agencia no puede provocar la creación de tu clon, no puede ampliar el alcance de lo que puede generarse y no puede impedir ni revertir tu retirada.",
          "Cualquier intento de un tercero de ejercer tus derechos de consentimiento será rechazado, y podremos notificarte del intento."
        ]
      },
      {
        "h": "14. Revocación y retirada del consentimiento — efectos",
        "p": [
          "Puedes retirar tu consentimiento bajo este Acuerdo en cualquier momento, total o parcialmente (por ejemplo, retirando solo el consentimiento a Contenido Sexualmente Explícito de la Sección 8), por cualquier motivo o sin motivo, sin penalización. La retirada puede poner fin a tu capacidad de usar el Servicio.",
          "Tras una retirada validada, bajo nuestro control: (a) detendremos de inmediato toda generación adicional que use tu Clon Digital; (b) desactivaremos y luego eliminaremos de forma permanente tu Clon Digital (los pesos LoRA y cualquier embedding/checkpoint asociado), tus Datos de Entrenamiento y los Datos Biométricos derivados; (c) eliminaremos el Contenido Generado que permanezca en nuestros sistemas; y (d) instruiremos a nuestros subencargados para que eliminen lo mismo, dentro del plazo de la Sección 7.",
          "Las únicas excepciones son los Registros de Conservación Legal —la información mínima que la ley nos obliga a conservar, incluidos los registros de edad/identidad/consentimiento del 18 U.S.C. § 2257, los registros fiscales y de transacciones, los registros sujetos a una retención por litigio y las pruebas que debamos preservar en relación con un reporte de CSAM o de imágenes íntimas no consentidas. Estos se conservan solo por el periodo mínimo exigido por ley («[POR DEFINIR: periodo legal de conservación de registros del § 2257 y financieros]»), con acceso restringido, se usan únicamente para fines de cumplimiento legal y luego se destruyen.",
          "La retirada opera hacia el futuro: no afecta la licitud del tratamiento realizado antes de la retirada, conforme al artículo 7(3) del RGPD. La retirada no puede recuperar ni eliminar Contenido Generado que ya hayas descargado, o que tú, tu Agencia o cualquier tercero ya hayan distribuido o publicado fuera de nuestro control; para ello, usa los mecanismos de retirada de la Sección 16. Te confirmaremos la finalización de la eliminación."
        ]
      },
      {
        "h": "15. Cómo retirar el consentimiento — mecanismo",
        "p": [
          "Puedes retirar el consentimiento por cualquiera de estas vías: (a) el control de revocación o \"eliminar mi clon\" en el panel de tu cuenta; (b) un correo a soporte@letshoot.ai desde la dirección registrada; o (c) aviso por escrito a la Operadora. Tu solicitud debe indicar si retiras por completo o solo un consentimiento específico (como el de la Sección 8 sobre Contenido Sexualmente Explícito).",
          "Para protegerte frente a una retirada fraudulenta o de terceros, podemos volver a verificar tu identidad antes de actuar sobre una solicitud de retirada, conforme a las Secciones 6 y 13. No usaremos la reverificación para demorar una solicitud genuina más allá de lo razonablemente necesario.",
          "Acusaremos recibo de tu solicitud con prontitud y completaremos la eliminación dentro del plazo de las Secciones 7 y 14, y te confirmaremos cuando esté hecho. La retirada es gratuita."
        ]
      },
      {
        "h": "16. Imágenes íntimas no consentidas — TAKE IT DOWN Act (retirada en 48 horas) y DMCA",
        "p": [
          "Apoyamos la retirada de imágenes íntimas no consentidas (NCII), incluidas imágenes íntimas generadas por IA o \"deepfakes\". Conforme a la TAKE IT DOWN Act, ante una solicitud válida tuya o de tu representante autorizado que reporte que una representación visual íntima tuya se está poniendo a disposición sin tu consentimiento, retiraremos el contenido reportado —y haremos esfuerzos razonables por retirar copias idénticas— de los sistemas bajo nuestro control dentro de las 48 horas de una solicitud válida.",
          "Si Contenido Generado de tu Imagen se está distribuyendo, publicando o explotando sin tu consentimiento —incluso por una Agencia, una expareja o cualquier tercero que lo haya obtenido— puedes reportarlo a soporte@letshoot.ai, y lo retiraremos de nuestros sistemas, cooperaremos con las gestiones lícitas de retirada y, cuando la conducta sea delictiva, cooperaremos con las autoridades.",
          "Para reclamaciones de que un contenido infringe un derecho de autor que ostentas, nuestro agente designado bajo la Digital Millennium Copyright Act (DMCA) es: «[POR DEFINIR: agente designado DMCA — nombre, dirección, correo, teléfono y número de registro ante la Oficina de Derechos de Autor de EE. UU.]». La retirada conforme a esta Sección es independiente y adicional a tus derechos de revocación de la Sección 14."
        ]
      },
      {
        "h": "17. Tus declaraciones y garantías",
        "p": [
          "Declaras y garantizas que: (a) tienes al menos 18 años y plena capacidad legal para celebrar este Acuerdo; (b) eres el único sujeto humano de tus Datos de Entrenamiento y posees o tienes todos los derechos necesarios para proporcionarlos y para otorgar la licencia de la Sección 4; (c) toda la información de identidad, edad y cuenta que proporcionas es verdadera y actual; (d) no estás suplantando a nadie ni actuando en nombre de, o por instrucción de, ningún tercero respecto de tu consentimiento de imagen; y (e) tu uso del Servicio y del Contenido Generado cumplirá la ley aplicable y las reglas de cualquier plataforma en la que publiques.",
          "Aceptas indemnizar y mantener indemne a la Operadora frente a reclamaciones de terceros derivadas de tu incumplimiento de estas declaraciones, de tu aportación de Datos de Entrenamiento que no tenías derecho a aportar, o de tu publicación o uso del Contenido Generado, salvo en la medida en que sean causadas por la propia conducta ilícita de la Operadora."
        ]
      },
      {
        "h": "18. Derechos de protección de datos y transferencias internacionales (RGPD / RGPD del Reino Unido / CCPA)",
        "p": [
          "Tus Datos de Entrenamiento, Datos Biométricos, Clon Digital y Contenido Generado se procesan y almacenan en Estados Unidos, en infraestructura que incluye Supabase y Vercel. Si te encuentras en el EEE, el Reino Unido u otra región con restricciones de transferencia de datos, entiendes que tus datos se transferirán a Estados Unidos; nos apoyamos en salvaguardas adecuadas para dichas transferencias, incluidas las Cláusulas Contractuales Tipo de la Comisión Europea y el Addendum de Transferencia Internacional de Datos del Reino Unido, y, para los datos de categoría especial y de adultos explícitos, en tu consentimiento explícito conforme a las Secciones 7 y 8.",
          "Sujeto a la ley aplicable, tienes derecho a acceder, rectificar, suprimir, limitar y portar tus datos personales, a oponerte a ciertos tratamientos y a retirar el consentimiento en cualquier momento (Secciones 14 y 15). Para ejercer estos derechos, escribe a soporte@letshoot.ai. Nuestro representante en la UE conforme al artículo 27 del RGPD es «[POR DEFINIR: representante del art. 27 del RGPD en la UE — nombre y dirección en la UE]» y nuestro representante en el Reino Unido es «[POR DEFINIR: representante del art. 27 del RGPD del Reino Unido — nombre y dirección en el Reino Unido]». Nuestro contacto de protección de datos es «[POR DEFINIR: Delegado de Protección de Datos o contacto de privacidad, si se designa]».",
          "Si resides en California, no vendemos ni \"compartimos\" (según define la CCPA/CPRA) tu información personal ni tu información personal sensible, incluidos tus Datos Biométricos e información sobre tu vida sexual; usamos tu información personal sensible solo para los fines que aquí autorizaste; y tienes los derechos a conocer, eliminar, corregir y limitar el uso de la información personal sensible, ejercitables en soporte@letshoot.ai."
        ]
      },
      {
        "h": "19. Cumplimiento con redes de tarjetas y procesadores de pago",
        "p": [
          "El Servicio se paga a través de procesadores de pago externos autorizados para contenido de adultos, incluidos CCBill y Epoch (Visa/Mastercard). Reconoces que tu verificación de edad, tu verificación de identidad y los consentimientos de este Acuerdo —incluido el consentimiento de la Sección 8 a Contenido Sexualmente Explícito y la regla de \"solo tu propia imagen\" de la Sección 5— forman parte de nuestro cumplimiento de los programas y reglas de contenido para adultos de las redes de tarjetas.",
          "Consientes en que mantengamos, y, cuando se requiera, pongamos a disposición de nuestros procesadores de pago y de las redes de tarjetas (sujeto a confidencialidad), documentación que confirme que la persona representada eres tú, que es adulta y que ha consentido, y que confirme que el Contenido Generado es generado por IA. No transmitimos tus documentos completos de verificación a las redes de tarjetas salvo en lo estrictamente exigido por sus programas."
        ]
      },
      {
        "h": "20. Titularidad, derechos morales y comentarios",
        "p": [
          "Entre tú y la Operadora, conservas todos los derechos sobre tu Imagen y, sujeto a la licencia de la Sección 4 y a los derechos de cualquier plataforma en la que publiques, eres titular del Contenido Generado que te representa. La Operadora es titular del Servicio, del software de la plataforma y de su arquitectura y herramientas de modelo generales; no obstante, los pesos del Clon Digital y los Datos Biométricos derivados de tu Imagen se tratan como datos personales tuyos a efectos de conservación, seguridad y eliminación conforme a las Secciones 7 y 14, y se eliminan al revocar.",
          "No reclamamos titularidad alguna sobre tu Imagen y no registraremos, invocaremos ni explotaremos ningún derecho de imagen, de personalidad o de marca sobre tu nombre, imagen o persona. En la medida permitida por la ley, renuncias a objeciones por derechos morales frente a nuestro tratamiento técnico de los Datos de Entrenamiento únicamente en lo necesario para construir y operar tu Clon Digital; esta renuncia no se extiende a ningún uso fuera de la licencia.",
          "Si nos proporcionas comentarios o sugerencias sobre el Servicio, podremos usarlos sin obligación hacia ti; los comentarios no incluyen tu Imagen, Datos de Entrenamiento ni Contenido Generado, que siguen regidos por este Acuerdo."
        ]
      },
      {
        "h": "21. Plazo, supervivencia y efectos de la terminación",
        "p": [
          "Este Acuerdo entra en vigor en la fecha de entrada en vigor y continúa por el plazo descrito en la Sección 4 (máximo diez años), salvo revocación o terminación anterior. Cualquiera de las partes puede terminar según lo previsto en los Términos de servicio; tú puedes revocar en cualquier momento conforme a las Secciones 14 y 15.",
          "Al terminar o revocar, la licencia de la Sección 4 finaliza, y eliminaremos tu Clon Digital, Datos de Entrenamiento, Datos Biométricos y el Contenido Generado restante bajo nuestro control, salvo los Registros de Conservación Legal. Sobreviven a la terminación las siguientes Secciones: 12 (custodio de registros), 14 (Registros de Conservación Legal), 17 (declaraciones e indemnización), 18 (obligaciones de protección de datos que por su naturaleza continúan), 20 (titularidad), 22 (ley aplicable y controversias) y 23 (registro del consentimiento), junto con cualquier disposición que por su naturaleza deba sobrevivir."
        ]
      },
      {
        "h": "22. Ley aplicable y resolución de controversias",
        "p": [
          "Este Acuerdo se rige por las leyes de «[POR DEFINIR: estado de EE. UU. cuya ley rige — nota: los Términos de servicio vigentes de LetShoot indican el Estado de Florida]», sin atender a sus normas de conflicto de leyes, y, cuando aplique a tus derechos de protección de datos, por las disposiciones imperativas de la ley de tu país de residencia que no puedan excluirse por acuerdo.",
          "Cualquier controversia derivada de o relacionada con este Acuerdo se resolverá mediante «[POR DEFINIR: mecanismo de resolución de controversias — p. ej., organismo, reglas y sede de arbitraje vinculante, o los tribunales competentes del estado cuya ley rige]». Nada en esta Sección impide a cualquiera de las partes solicitar medidas cautelares para detener el uso o divulgación no autorizados de tu Imagen, Datos Biométricos o Clon Digital, ni ejercer derechos legales irrenunciables.",
          "Este Acuerdo no renuncia a ningún derecho que tengas bajo la legislación aplicable de protección al consumidor, de privacidad biométrica o de protección de datos que no pueda renunciarse por contrato."
        ]
      },
      {
        "h": "23. Firma electrónica, versionado y registro del consentimiento",
        "p": [
          "Firmas este Acuerdo de forma electrónica. Conforme a la ESIGN Act y la UETA de EE. UU., y al eIDAS en la UE, tu firma electrónica tiene el mismo efecto legal que una firma manuscrita. Al completar el bloque de firma, aceptas contratar electrónicamente y adoptas tu nombre escrito y/o tu firma dibujada como tu firma.",
          "En el momento en que firmas, capturamos y almacenamos automáticamente, como tu registro de consentimiento: el número de versión de este Acuerdo que firmaste; la fecha y hora de la firma (registrada en UTC); la dirección IP desde la que firmaste; la información del dispositivo/agente de usuario; las declaraciones y casillas de consentimiento específicas que afirmaste (incluido el consentimiento separado a contenido explícito de la Sección 8); y tu nombre de firmante. Este registro se conserva como prueba de que el consentimiento se otorgó de forma libre, específica, informada e inequívoca, y puede aportarse para demostrar cumplimiento, incluso ante auditores, procesadores de pago y autoridades cuando se requiera.",
          "Este Acuerdo está versionado. Si realizamos un cambio sustancial en el alcance de la licencia, las categorías de Contenido Generado, la conservación o tus derechos, el cambio no te será aplicable hasta que revises y firmes la nueva versión; conservamos el historial completo de versiones de lo que consentiste y cuándo. El uso continuado sin volver a firmar no extiende el consentimiento a un tratamiento sustancialmente nuevo."
        ]
      },
      {
        "h": "24. Reconocimiento y firma",
        "p": [
          "Al firmar a continuación, reconoces y aceptas que: has leído y entendido este Acuerdo; tienes al menos 18 años y eres el único sujeto humano de tus Datos de Entrenamiento; otorgas la licencia limitada, no exclusiva, revocable y con tope temporal de la Sección 4 para crear y operar un Clon Digital de tu propia Imagen y generar contenido a partir de él; consientes por separado y de forma explícita en Contenido Sexualmente Explícito de tu propia Imagen conforme a la Sección 8; entiendes la distinción crear-vs-publicar de la Sección 9; entiendes que este consentimiento es personal tuyo y que ninguna Agencia ni tercero puede otorgarlo ni retirarlo; y entiendes cómo retirar tu consentimiento y qué ocurrirá con tu Clon Digital y tus datos cuando lo hagas.",
          "Firma: __________________________   Nombre legal en letra de imprenta: __________________________   Fecha: __________.   Lo siguiente se captura automáticamente al firmar y forma parte de este registro: versión del Acuerdo, marca de tiempo (UTC), dirección IP e información del dispositivo/agente de usuario. Operadora: ASM Media Group LLC (letshoot.ai) — soporte@letshoot.ai. Este es un borrador para revisión de un abogado y no constituye asesoría legal."
        ]
      }
    ]
  },
  "en": {
    "title": "AI Likeness License & Digital Clone Consent Agreement",
    "s": [
      {
        "h": "1. Parties, Purpose, and How to Read This Agreement",
        "p": [
          "This AI Likeness License & Digital Clone Consent Agreement (this \"Agreement\") is entered into between you, the individual content creator identified in the electronic signature block below (\"you,\" \"your,\" or the \"Creator\"), and ASM Media Group LLC, operator of letshoot.ai (\"we,\" \"us,\" \"Operator,\" or \"LetShoot\"). This Agreement is the core, standalone instrument by which you authorize us to build and operate an artificial-intelligence model of your own likeness and to generate content from it.",
          "This Agreement supplements, and is incorporated by reference into, the LetShoot Terms of Service and Privacy Policy. In the event of a direct conflict specifically concerning the creation, training, operation, revocation, or deletion of your Digital Clone, or your consent to sexually explicit output, this Agreement controls; on all other matters the Terms of Service control.",
          "This Agreement takes effect only when you complete the electronic signature described in Section 23 and only after your identity and age have been verified under Section 6. Until then, no Digital Clone of you will be created or operated. This document is an internal draft prepared for review by the Operator's counsel; it is not legal advice to you."
        ]
      },
      {
        "h": "2. Definitions",
        "p": [
          "\"Likeness\" means your face, body, voice, physical characteristics, mannerisms, and any other personal attribute by which you are identifiable, together with the photographs and videos of yourself that you provide.",
          "\"Training Data\" means the photographs, videos, and related material of yourself that you upload so that we can build your model, together with the technical features and facial/body geometry we derive from that material.",
          "\"Digital Clone\" or \"LoRA Model\" means the fine-tuned set of machine-learning parameters (a low-rank adaptation, or \"LoRA,\" and any associated embeddings, checkpoints, or configuration) that we train from your Training Data and that can generate new synthetic images and video resembling you.",
          "\"Generated Content\" means the synthetic photographs and videos produced by operating your Digital Clone at your direction.",
          "\"Sexually Explicit Content\" means Generated Content that depicts nudity, sexual conduct, or sexually explicit poses of your Likeness, as further consented to in Section 8.",
          "\"Create\" means to generate and deliver Generated Content to you (and, if you have separately authorized it, to your Agency). \"Publish\" means to make Generated Content available to the public or to distribute it on third-party platforms.",
          "\"Biometric Data\" means biometric identifiers and biometric information derived from your Likeness, including facial geometry, and constitutes \"special category\" data under the GDPR and \"biometric information\" under laws such as the Illinois Biometric Information Privacy Act (BIPA).",
          "\"Agency\" means any talent agency, manager, or third party you have separately authorized to receive or manage your Generated Content. \"Legally Retained Records\" has the meaning given in Section 14."
        ]
      },
      {
        "h": "3. What the Digital Clone (LoRA Model) Is",
        "p": [
          "Your Digital Clone is a statistical model, not a library of your photographs and not a recording of any real event. During training, our system learns numerical patterns from your Training Data and encodes them into a compact set of model weights (the LoRA). When operated, the model synthesizes new images and video that resemble you but that depict events, poses, and scenes that never physically occurred.",
          "Each Digital Clone is siloed to you. It is trained only on Training Data of you, is used only to generate content of you at your direction, and is never combined with, blended with, or trained on any other person's likeness for your model, nor used to generate content for any other customer. We do not use your Digital Clone to train, seed, or improve any general-purpose or shared model, and we do not sell it.",
          "Because the Digital Clone is derived from your Biometric Data, we treat the model weights themselves as personal data belonging to you for the purposes of retention, security, and deletion under Sections 7 and 14. The Digital Clone is stored using access controls, encryption in transit and at rest, and logging appropriate to its sensitivity."
        ]
      },
      {
        "h": "4. Grant of License — Scope, Non-Exclusivity, Term (Maximum 10 Years)",
        "p": [
          "Subject to the terms of this Agreement, you grant the Operator a limited, non-exclusive, revocable, non-transferable, and non-sublicensable (except to our subprocessors strictly to operate the Service on our behalf) license to: (a) receive, store, and process your Training Data; (b) create, train, fine-tune, store, host, and operate your Digital Clone; and (c) generate, store, and deliver Generated Content depicting your own Likeness, in each case solely to provide the Service to you.",
          "This license is non-exclusive. You retain all rights in and to your own Likeness and may authorize, license, or exploit your Likeness elsewhere and through any other means at any time. Nothing in this Agreement assigns your Likeness or your personality/publicity rights to us.",
          "This license is granted for a term beginning on the effective date and ending on the earliest of: (i) your revocation of consent under Section 14; (ii) termination or closure of your account; or (iii) the tenth (10th) anniversary of the effective date. On the tenth anniversary the license automatically expires; to continue the Service after that date you must sign a new, current version of this consent. We will not treat silence or continued payment as renewal of an expired likeness license.",
          "The license is limited strictly to the purposes above. Any use of your Digital Clone, Training Data, or Generated Content beyond those purposes is outside the scope of this license and requires your separate, specific consent."
        ]
      },
      {
        "h": "5. Only Your Own Likeness",
        "p": [
          "You may authorize a Digital Clone of yourself and of no one else. You represent and warrant that you are the sole human subject of all Training Data you provide, that you are the person depicted, and that you are not uploading, cloning, or requesting content based on any other living or deceased person, any composite of multiple people, any celebrity or \"lookalike,\" any fictional persona based on a real third party, or any minor.",
          "Cloning another person's likeness — with or without their permission — is strictly prohibited on this platform. This is a non-negotiable rule: LetShoot exists only to let you make content of your own verified self.",
          "We screen Training Data and account activity for this rule. If we detect or reasonably suspect that Training Data depicts anyone other than you, we will refuse to build or will disable the Digital Clone, may suspend or terminate your account, and, where the content or conduct is unlawful, will report it to the appropriate authorities as described in Sections 10 and 16."
        ]
      },
      {
        "h": "6. Identity and Age Verification; Sole-Subject Attestation",
        "p": [
          "Before any Digital Clone is created, you must complete identity and age verification, including a valid government-issued photo ID and a live selfie or liveness check. You must be at least 18 years old (or the age of majority in your jurisdiction, if higher). We must be able to reasonably match the identity on your ID, the person in your Training Data, and the account holder.",
          "You attest that the person shown in your verification documents and in all Training Data is you, and only you. We may re-verify your identity at any time, including before honoring a revocation request under Section 15, before creating a new model version, and periodically as required by law or by our payment processors.",
          "Providing false, borrowed, or altered identity documents, or attesting falsely to being the sole subject, is a material breach of this Agreement, will result in immediate termination, and may be reported to authorities and to our payment processors."
        ]
      },
      {
        "h": "7. Biometric Data — Explicit Consent, Retention, and Destruction (BIPA / GDPR Art. 9)",
        "p": [
          "You expressly and specifically consent to our collection, storage, and use of your Biometric Data — including facial and body geometry derived from your Training Data — for the sole and limited purpose of creating, training, operating, and (when authorized) improving your own Digital Clone and generating your Generated Content. This is your freely given, informed, written consent for purposes of BIPA and Article 9(2)(a) of the GDPR (explicit consent to process special category data).",
          "We will not sell, lease, trade, or otherwise profit from your Biometric Data, and we will not disclose it except to the subprocessors that host and run the Service on our behalf under written confidentiality and data-processing obligations, or where disclosure is required by law or to respond to a valid legal process.",
          "We retain your Biometric Data and Digital Clone only for as long as your license is active and this retention remains necessary for the purposes above, and in any event no longer than «[TO BE SET: maximum biometric data retention period, consistent with the BIPA three-year-from-last-interaction guideline and the 10-year license cap]». Upon revocation, expiry, or account closure, we will permanently destroy your Biometric Data and Digital Clone within «[TO BE SET: post-revocation destruction window, e.g., 30 days]», except for Legally Retained Records under Section 14.",
          "We maintain a written, publicly available biometric data retention-and-destruction policy, and we will destroy Biometric Data in accordance with that policy and this Section. Destruction means deletion of the model weights, derived biometric features, and Training Data from production systems and, on the applicable backup cycle, from backups."
        ]
      },
      {
        "h": "8. Explicit Consent to Sexually Explicit AI Output of Your Likeness (GDPR Art. 9(2)(a))",
        "p": [
          "You expressly, specifically, and freely consent to the creation of Sexually Explicit Content — including nude, sexual, and pornographic photographs and video — that depicts your own Likeness, generated by your Digital Clone at your direction. You understand the explicit adult nature of this output and confirm that you want it produced.",
          "Because Sexually Explicit Content may reveal or allow inferences about your sex life or sexual orientation, this is special category data under Article 9 of the GDPR. This Section is your explicit consent under Article 9(2)(a) to process such data for the specific purpose of generating your adult Generated Content, and it is separate from and additional to the general consent in Section 4.",
          "You may set limits on the categories, acts, wardrobe, settings, or scenarios your Digital Clone may depict, and we will honor reasonable, lawful limits you communicate through the platform. You may withdraw this specific consent to Sexually Explicit Content at any time under Sections 14 and 15 without withdrawing your entire account, in which case we will cease generating Sexually Explicit Content of you.",
          "This consent to sexually explicit output never overrides Section 10: no consent you give can authorize content that is unlawful, that depicts minors or minor-appearing subjects, or that depicts any person other than you."
        ]
      },
      {
        "h": "9. Two Layers of Consent — Create vs. Publish",
        "p": [
          "This Agreement distinguishes between consent to Create and consent to Publish. By default, your consent authorizes us only to Create — that is, to generate Generated Content and deliver it to you (and, if you have separately authorized it in your account, to your named Agency). By default we do not Publish or distribute your Generated Content to the public on your behalf.",
          "Publication of your Generated Content on third-party adult platforms, social media, or elsewhere is a separate act that you (or your authorized Agency) control and are responsible for. If our Service includes any feature by which we publish or post on your behalf, that feature will require your separate, specific Publish consent, given per campaign, per batch, or per asset as configured, and revocable independently of your Create consent.",
          "Withdrawing Publish consent stops us (and any publishing feature you enabled) from making further Generated Content public and, where we operate a distribution channel on your behalf, causes us to remove your content from that channel. Withdrawing Publish consent cannot, by itself, retract Generated Content that you or a third party have already downloaded, distributed, or published outside our control; for those, the removal mechanisms in Section 16 apply.",
          "You may require per-batch or per-asset review and approval before either Creation is finalized or, where applicable, Publication occurs, and we will honor that setting where offered."
        ]
      },
      {
        "h": "10. Content Boundaries and Prohibited Outputs",
        "p": [
          "No consent under this Agreement authorizes, and we will never knowingly create or permit, any content that is unlawful. We maintain zero tolerance for child sexual abuse material (CSAM) and for any content that depicts, or appears to depict, a minor in a sexual or exploitative manner, including any attempt to make your adult Digital Clone appear underage. Any such attempt will result in immediate termination and a report to the National Center for Missing & Exploited Children (NCMEC) and other competent authorities, and preservation of the relevant records as required by law.",
          "We also prohibit Generated Content that depicts any identifiable person other than you; non-consensual intimate imagery of any person; real or realistic violence, gore, or non-consensual acts presented as real; and any category prohibited by applicable law or by the card-network adult-content rules referenced in Section 19.",
          "You may specify additional scenarios you do not wish your Digital Clone to depict, and we will treat those as prohibited for your model. Our enforcement of these boundaries does not make us the author or endorser of the lawful content you direct us to Create."
        ]
      },
      {
        "h": "11. AI Provenance and Labeling",
        "p": [
          "All Generated Content is synthetic, AI-generated media. You acknowledge this and agree that it may be labeled as such. Where technically feasible, we embed provenance information into Generated Content — for example, C2PA-style content credentials, cryptographic signatures, and/or visible or invisible watermarks — indicating that the content is AI-generated and produced by LetShoot.",
          "You agree not to remove, alter, or obscure provenance metadata or watermarks that we apply, and you agree to comply with any applicable law or platform rule that requires disclosure that content is AI-generated or digitally created, including AI-transparency and synthetic-media disclosure laws in the jurisdictions where you publish.",
          "Provenance labeling supports lawful use, platform compliance, and protection against misuse of your Likeness. It is not a guarantee that third parties will preserve the labeling after content leaves our systems."
        ]
      },
      {
        "h": "12. Operator as Records Custodian and 18 U.S.C. § 2257 Producer",
        "p": [
          "For purposes of the U.S. federal record-keeping requirements of 18 U.S.C. § 2257 and § 2257A and their implementing regulations, and to the extent those requirements apply to AI-generated adult depictions, the Operator acts as the producer and record custodian with respect to Generated Content created through the Service. We maintain age-verification, identity, and consent records for every individual whose Likeness is used, including you.",
          "You agree that the Operator is the party responsible for keeping these records, you agree to cooperate in providing and updating the information needed for them, and you consent to our retention of these records as Legally Retained Records under Section 14 even after your Digital Clone is deleted.",
          "The custodian of records and the U.S. address at which records are maintained are: «[TO BE SET: 18 U.S.C. § 2257 Custodian of Records — full legal name and U.S. street address where records are kept]». Records-inspection requests may be directed to soporte@letshoot.ai."
        ]
      },
      {
        "h": "13. Personal, Non-Delegable Nature of This Consent",
        "p": [
          "This consent is personal to you. Only you, the Creator, can grant, modify, or withdraw it. No Agency, manager, agent, partner, spouse, or other third party may grant, sign, alter, or withdraw this consent on your behalf, and we will not act on any such instruction, even if that person holds a power of attorney or claims to manage your career or your content, except where we are compelled to do so by law or valid legal process.",
          "If you have authorized an Agency to receive or manage your Generated Content, that authorization is limited to the handling of already-created content and does not transfer to the Agency any power over your underlying likeness consent, your Biometric Data, your Digital Clone, or your right of revocation. The Agency cannot cause your clone to be created, cannot expand the scope of what may be generated, and cannot prevent or reverse your withdrawal.",
          "Any attempt by a third party to exercise your consent rights will be rejected, and we may notify you of the attempt."
        ]
      },
      {
        "h": "14. Revocation and Withdrawal of Consent — Effects",
        "p": [
          "You may withdraw your consent under this Agreement at any time, in whole or in part (for example, withdrawing only the Sexually Explicit Content consent under Section 8), for any reason or no reason, without penalty. Withdrawal may end your ability to use the Service.",
          "Upon a validated withdrawal, we will, under our control: (a) immediately stop all further generation using your Digital Clone; (b) deactivate and then permanently delete your Digital Clone (the LoRA weights and any associated embeddings/checkpoints), your Training Data, and the Biometric Data derived from it; (c) delete Generated Content that remains within our systems; and (d) instruct our subprocessors to delete the same, within the window stated in Section 7.",
          "The only exceptions are Legally Retained Records — the minimum information we are legally required to keep, including 18 U.S.C. § 2257 age/identity/consent records, tax and transaction records, records subject to a litigation hold, and evidence we are required to preserve in connection with a report of CSAM or non-consensual intimate imagery. These are retained only for the minimum period required by law («[TO BE SET: statutory retention period for § 2257 and financial records]»), kept access-restricted, and used only for legal-compliance purposes, then destroyed.",
          "Withdrawal operates prospectively: it does not affect the lawfulness of processing carried out before withdrawal, consistent with Article 7(3) of the GDPR. Withdrawal cannot retrieve or delete Generated Content that you already downloaded, or that you, your Agency, or any third party already distributed or published outside our control; for those, use the removal mechanisms in Section 16. We will confirm completion of deletion to you."
        ]
      },
      {
        "h": "15. How to Withdraw — Mechanism",
        "p": [
          "You may withdraw consent through any of the following: (a) the revocation or \"delete my clone\" control in your account dashboard; (b) an email to soporte@letshoot.ai from the address on file; or (c) written notice to the Operator. Your request should indicate whether you are withdrawing entirely or only a specific consent (such as the Section 8 consent to Sexually Explicit Content).",
          "To protect you against fraudulent or third-party withdrawal, we may re-verify your identity before acting on a withdrawal request, consistent with Sections 6 and 13. We will not use re-verification to delay a genuine request beyond what is reasonably necessary.",
          "We will acknowledge your request promptly and complete deletion within the window in Sections 7 and 14, and we will confirm when it is done. Withdrawal is free of charge."
        ]
      },
      {
        "h": "16. Non-Consensual Intimate Imagery — TAKE IT DOWN Act (48-Hour Removal) and DMCA",
        "p": [
          "We support the removal of non-consensual intimate imagery (NCII), including AI-generated or \"deepfake\" intimate images. Consistent with the TAKE IT DOWN Act, upon a valid request from you or your authorized representative reporting that an intimate visual depiction of you is being made available without your consent, we will remove the reported content — and make reasonable efforts to remove identical copies — from systems under our control within 48 hours of a valid request.",
          "If Generated Content of your Likeness is being distributed, published, or exploited without your consent — including by an Agency, a former partner, or any third party who obtained it — you may report it to soporte@letshoot.ai, and we will remove it from our systems, cooperate with lawful takedown efforts, and, where the conduct is criminal, cooperate with authorities.",
          "For claims that content infringes a copyright you hold, our designated agent under the Digital Millennium Copyright Act (DMCA) is: «[TO BE SET: DMCA designated agent — name, address, email, phone, and U.S. Copyright Office registration number]». Removal under this Section is separate from, and additional to, your revocation rights under Section 14."
        ]
      },
      {
        "h": "17. Your Representations and Warranties",
        "p": [
          "You represent and warrant that: (a) you are at least 18 years old and have full legal capacity to enter this Agreement; (b) you are the sole human subject of your Training Data and you own or hold all rights necessary to provide it and to grant the license in Section 4; (c) all identity, age, and account information you provide is true and current; (d) you are not impersonating anyone and are not acting on behalf of, or at the direction of, any third party as to your likeness consent; and (e) your use of the Service and of Generated Content will comply with applicable law and the rules of any platform on which you publish.",
          "You agree to indemnify and hold harmless the Operator from third-party claims arising out of your breach of these representations, your provision of Training Data you were not entitled to provide, or your publication or use of Generated Content, except to the extent caused by the Operator's own unlawful conduct."
        ]
      },
      {
        "h": "18. Data Protection Rights and International Transfers (GDPR / UK GDPR / CCPA)",
        "p": [
          "Your Training Data, Biometric Data, Digital Clone, and Generated Content are processed and stored in the United States on infrastructure including Supabase and Vercel. If you are located in the EEA, the UK, or another region with data-transfer restrictions, you understand that your data will be transferred to the United States; we rely on appropriate safeguards for such transfers, including the European Commission's Standard Contractual Clauses and the UK International Data Transfer Addendum, and, for the special category and explicit adult data, on your explicit consent under Sections 7 and 8.",
          "Subject to applicable law, you have the right to access, rectify, erase, restrict, and port your personal data, to object to certain processing, and to withdraw consent at any time (Sections 14 and 15). To exercise these rights, contact soporte@letshoot.ai. Our EU representative under Article 27 of the GDPR is «[TO BE SET: EU GDPR Article 27 representative — name and EU address]» and our UK representative is «[TO BE SET: UK GDPR Article 27 representative — name and UK address]». Our data protection contact is «[TO BE SET: Data Protection Officer or privacy contact, if appointed]».",
          "If you are a California resident, we do not sell or \"share\" (as defined by the CCPA/CPRA) your personal information or sensitive personal information, including your Biometric Data and information about your sex life; we use your sensitive personal information only for the purposes you have authorized here; and you have the rights to know, delete, correct, and limit the use of sensitive personal information, exercisable at soporte@letshoot.ai."
        ]
      },
      {
        "h": "19. Card-Network and Payment-Processor Compliance",
        "p": [
          "The Service is paid for through third-party payment processors authorized for adult content, including CCBill and Epoch (Visa/Mastercard). You acknowledge that your age verification, identity verification, and the consents in this Agreement — including the Section 8 consent to Sexually Explicit Content and the Section 5 only-your-own-likeness rule — form part of our compliance with card-network adult-content programs and rules.",
          "You consent to our maintaining, and, where required, making available to our payment processors and the card networks (subject to confidentiality), documentation confirming that the depicted individual is you, is an adult, and has consented, and confirming that the Generated Content is AI-generated. We do not transmit your full verification documents to the card networks except as strictly required by their programs."
        ]
      },
      {
        "h": "20. Ownership, Moral Rights, and Feedback",
        "p": [
          "As between you and the Operator, you retain all rights in and to your Likeness and, subject to the license in Section 4 and the rights of any platform on which you publish, you own the Generated Content depicting you. The Operator owns the Service, the platform software, and its general model architecture and tooling; however, the Digital Clone weights and Biometric Data derived from your Likeness are treated as your personal data for retention, security, and deletion purposes under Sections 7 and 14, and are deleted on revocation.",
          "We claim no ownership of your Likeness and will not register, assert, or exploit any publicity, personality, or trademark right in your name, image, or persona. To the extent permitted by law, you waive moral-rights objections to our technical processing of Training Data solely as needed to build and operate your Digital Clone; this waiver does not extend to any use outside the license.",
          "If you provide feedback or suggestions about the Service, we may use them without obligation to you; feedback does not include your Likeness, Training Data, or Generated Content, which remain governed by this Agreement."
        ]
      },
      {
        "h": "21. Term, Survival, and Effect of Termination",
        "p": [
          "This Agreement takes effect on the effective date and continues for the term described in Section 4 (maximum ten years), unless earlier revoked or terminated. Either party may terminate as provided in the Terms of Service; you may revoke at any time under Sections 14 and 15.",
          "On termination or revocation, the license in Section 4 ends, and we will delete your Digital Clone, Training Data, Biometric Data, and remaining Generated Content under our control, except for Legally Retained Records. The following survive termination: Sections 12 (records custodian), 14 (Legally Retained Records), 17 (representations and indemnity), 18 (data-protection obligations that by their nature continue), 20 (ownership), 22 (governing law and disputes), and 23 (record of consent), together with any provision that by its nature should survive."
        ]
      },
      {
        "h": "22. Governing Law and Dispute Resolution",
        "p": [
          "This Agreement is governed by the laws of «[TO BE SET: governing-law U.S. state — note: the current LetShoot Terms of Service specify the State of Florida]», without regard to its conflict-of-laws rules, and, where applicable to your data-protection rights, by the mandatory provisions of the law of your country of residence that cannot be excluded by agreement.",
          "Any dispute arising out of or relating to this Agreement will be resolved through «[TO BE SET: dispute-resolution mechanism — e.g., binding arbitration body, rules, and seat, or the competent courts of the governing-law state]». Nothing in this Section prevents either party from seeking injunctive relief to stop unauthorized use or disclosure of your Likeness, Biometric Data, or Digital Clone, or from exercising non-waivable statutory rights.",
          "This Agreement does not waive any right you have under applicable consumer-protection, biometric-privacy, or data-protection law that cannot be waived by contract."
        ]
      },
      {
        "h": "23. Electronic Signature, Versioning, and Record of Consent",
        "p": [
          "You sign this Agreement electronically. Under the U.S. ESIGN Act and UETA, and eIDAS in the EU, your electronic signature has the same legal effect as a handwritten signature. By completing the signature block, you agree to transact electronically and you adopt your typed name and/or drawn signature as your signature.",
          "At the moment you sign, we automatically capture and store, as your record of consent: the version number of this Agreement that you signed; the date and time of signature (recorded in UTC); the IP address from which you signed; the device/user-agent information; the specific consent statements and checkboxes you affirmed (including the separate Section 8 explicit-content consent); and your signer name. This record is retained as evidence that consent was freely given, specific, informed, and unambiguous, and may be produced to demonstrate compliance, including to auditors, payment processors, and authorities where required.",
          "This Agreement is versioned. If we make a material change to the scope of the license, the categories of Generated Content, retention, or your rights, the change will not apply to you until you review and sign the new version; we retain the full version history of what you consented to and when. Continued use without re-signing does not extend consent to materially new processing."
        ]
      },
      {
        "h": "24. Acknowledgment and Signature",
        "p": [
          "By signing below, you acknowledge and agree that: you have read and understood this Agreement; you are at least 18 years old and the sole human subject of your Training Data; you grant the limited, non-exclusive, revocable, time-capped license in Section 4 to create and operate a Digital Clone of your own Likeness and to generate content from it; you separately and explicitly consent to Sexually Explicit Content of your own Likeness under Section 8; you understand the create-versus-publish distinction in Section 9; you understand that this consent is personal to you and cannot be granted or withdrawn by any Agency or third party; and you understand how to withdraw your consent and what will happen to your Digital Clone and data when you do.",
          "Signature: __________________________   Printed legal name: __________________________   Date: __________.   The following are captured automatically at signing and form part of this record: Agreement version, timestamp (UTC), IP address, and device/user-agent. Operator: ASM Media Group LLC (letshoot.ai) — soporte@letshoot.ai. This is a draft for attorney review and is not legal advice."
        ]
      }
    ]
  }
};

export default function LikenessConsentPage() {
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
