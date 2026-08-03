'use client';

// Auto-assembled legal page. DRAFT — must be reviewed by an attorney before publishing.
// Bilingual ES/EN via useLegalLang(). Placeholders marked [POR DEFINIR / TO BE SET].
import LegalPage, { Section, useLegalLang } from '@/components/LegalPage';

const C = {
  "es": {
    "title": "Política DMCA / Propiedad intelectual y Agente designado",
    "s": [
      {
        "h": "1. Objeto y alcance",
        "p": [
          "Esta Política DMCA / de Propiedad Intelectual y Agente Designado (la \"Política\") explica cómo ASM Media Group LLC (\"nosotros\", \"nos\", \"nuestro\" o la \"Compañía\"), operadora del sitio letshoot.ai y del portal para creadoras asociado (en conjunto, el \"Servicio\"), responde a las reclamaciones por infracción de derechos de autor y a las reclamaciones conexas de propiedad intelectual y de imagen conforme a la Ley de Derechos de Autor del Milenio Digital de los Estados Unidos, 17 U.S.C. § 512 (la \"DMCA\"), y a la normativa relacionada. Esta Política se incorpora y forma parte de nuestros Términos de servicio.",
          "El Servicio permite que personas creadoras de contenido para adultos (mayores de 18 años) suban fotografías de sí mismas para que podamos entrenar un modelo de imagen por inteligencia artificial individual (un \"clon digital\" o LoRA) y generar nuevas imágenes y videos de la propia imagen verificada y consentida de esa misma creadora, que luego distribuye y vende en plataformas para adultos. Por este diseño, las disputas de propiedad intelectual e imagen que enfrentamos suelen encuadrarse en dos categorías: (a) reclamaciones ordinarias de derechos de autor sobre fotografías, video u otras obras, y (b) reclamaciones de que el nombre, la imagen, la voz o la apariencia de una persona se usan sin autorización. Esta Política aborda ambas y remite a los canales no relacionados con derechos de autor cuando corresponden y son más rápidos.",
          "Atendemos los avisos DMCA presentados correctamente, actuamos con rapidez ante reportes creíbles de uso indebido de la imagen de alguien y, por igual, protegemos a nuestras personas usuarias frente a solicitudes de retirada falsas, erróneas o abusivas. Este documento es una política operativa, no asesoramiento legal; si tienes dudas sobre tus derechos u obligaciones, consulta a una persona abogada."
        ]
      },
      {
        "h": "2. Definiciones",
        "p": [
          "\"Obra\" significa cualquier material protegible por derechos de autor, incluidas fotografías, videos, imágenes, texto, audio o software.",
          "\"Titular de derechos de autor\" o \"titular\" significa la persona propietaria de un derecho exclusivo de autor sobre una Obra, o quien está autorizada para actuar en su nombre. \"Reclamante\" significa cualquier persona que presenta un aviso conforme a esta Política.",
          "\"Persona que sube el contenido\" o \"Suscriptora\" significa la creadora o titular de la cuenta que subió, generó o es responsable del material identificado en un aviso.",
          "\"Agente designado\" significa el agente que hemos registrado ante la Oficina de Derechos de Autor de los EE. UU. para recibir notificaciones DMCA, identificado en la Sección 4.",
          "\"Imagen\" significa el nombre, la imagen, la apariencia física reconocible o (cuando la ley lo proteja) la voz de una persona. \"Réplica digital\" significa una representación generada por computadora, asistida por IA o sintética de la imagen o la voz de una persona real. \"CINC\" (contenido íntimo no consentido) significa imágenes íntimas no consentidas, incluidas las auténticas y las generadas por IA (\"deepfakes\"), publicadas sin el consentimiento de la persona representada.",
          "\"Día hábil\" significa cualquier día distinto de sábado, domingo o feriado federal de los EE. UU."
        ]
      },
      {
        "h": "3. Nuestro respeto por la propiedad intelectual y la regla de solo tu propia imagen",
        "p": [
          "Exigimos que toda persona creadora certifique, antes de activar el Servicio, que es la persona representada en las fotografías subidas y que posee o controla todos los derechos necesarios para subir esas fotografías y autorizar la creación de un clon digital a partir de ellas. El Servicio solo puede usarse para clonar tu propia imagen verificada. Solicitar, subir, entrenar o generar la imagen de cualquier otra persona real está estrictamente prohibido y es causa de terminación inmediata y, cuando proceda, de denuncia a las autoridades.",
          "Debido a que actuamos como productores del contenido íntimo generado en la plataforma (incluso a efectos de las obligaciones de conservación de registros de 18 U.S.C. §§ 2257–2257A), mantenemos registros de identificación oficial y verificación de edad, así como consentimientos firmados, que acreditan que la persona representada es adulta y consintió tanto la creación como la publicación de contenido construido a partir de su imagen. Estos registros nos permiten resolver la mayoría de las disputas de derechos de autor y de derecho de imagen de forma rápida y fiable.",
          "Nada en esta Política limita nuestro derecho a retirar o inhabilitar cualquier contenido, ni a suspender o terminar cualquier cuenta, a nuestra discreción, cuando consideremos que se han vulnerado nuestros Términos de servicio, la ley aplicable o los derechos de un tercero."
        ]
      },
      {
        "h": "4. Agente designado para derechos de autor",
        "p": [
          "Hemos designado y registrado ante la Oficina de Derechos de Autor de los EE. UU. a un agente para recibir notificaciones de presunta infracción de derechos de autor. Todos los avisos de retirada DMCA y las contranotificaciones deben enviarse a nuestro Agente designado usando los datos que figuran a continuación.",
          "Agente designado para derechos de autor: «[POR DEFINIR: nombre y/o cargo del Agente designado DMCA, p. ej., 'Agente de Derechos de Autor, ASM Media Group LLC']».",
          "Dirección postal: «[POR DEFINIR: domicilio físico (calle) en los Estados Unidos registrado en el Directorio de Agentes Designados DMCA de la Oficina de Derechos de Autor]».",
          "Correo electrónico: «[POR DEFINIR: dirección de correo dedicada a DMCA registrada ante la Oficina de Derechos de Autor]». Teléfono: «[POR DEFINIR: número de teléfono registrado ante la Oficina de Derechos de Autor]».",
          "Registro del Agente designado DMCA ante la Oficina de Derechos de Autor de los EE. UU.: «[POR DEFINIR: referencia de registro/entrada en el Directorio y fecha de vigencia]».",
          "Este canal es únicamente para asuntos de derechos de autor y otras cuestiones de propiedad intelectual o de imagen. El soporte general, las consultas de facturación y otra correspondencia deben enviarse a soporte@letshoot.ai. Los avisos dirigidos por error al canal equivocado pueden retrasarse y no considerarse efectivos en la fecha de recepción."
        ]
      },
      {
        "h": "5. Cómo presentar un aviso de retirada DMCA — elementos requeridos",
        "p": [
          "Si eres titular de derechos de autor o agente autorizado y crees que una Obra ha sido copiada y puesta a disposición a través del Servicio de forma que constituye una infracción, puedes enviar un aviso de retirada por escrito a nuestro Agente designado. Para ser efectivo conforme a 17 U.S.C. § 512(c)(3), tu aviso debe incluir sustancialmente todos los siguientes seis elementos.",
          "(1) Una firma física o electrónica de una persona autorizada para actuar en nombre de la titular del derecho exclusivo presuntamente infringido.",
          "(2) La identificación de la Obra protegida cuya infracción se reclama o, si un mismo aviso abarca varias Obras, una lista representativa de ellas.",
          "(3) La identificación del material que se reclama como infractor o como objeto de actividad infractora, y la información razonablemente suficiente para que podamos localizar el material —por ejemplo, la(s) URL, el (los) nombre(s) de archivo o la(s) página(s) del Servicio donde aparece.",
          "(4) Información razonablemente suficiente para que podamos contactarte, como tu nombre completo, dirección postal, número de teléfono y correo electrónico.",
          "(5) Una declaración de que tienes la creencia de buena fe de que el uso del material en la forma denunciada no está autorizado por el titular de los derechos de autor, su agente o la ley.",
          "(6) Una declaración de que la información del aviso es exacta y —bajo pena de perjurio— de que eres la titular de los derechos de autor o estás autorizada para actuar en nombre de la titular del derecho exclusivo presuntamente infringido.",
          "Un aviso que no cumpla sustancialmente con todos estos elementos podría no considerarse efectivo y, por sí solo, no generar nuestra obligación de actuar; no obstante, si un aviso es defectuoso solo en cuanto a los elementos (2), (3) o (4), tomaremos medidas razonables para contactarte u obtener de otro modo la información faltante."
        ]
      },
      {
        "h": "6. Cómo y dónde enviar tu aviso",
        "p": [
          "Envía tu aviso al Agente designado indicado en la Sección 4. El correo electrónico a la dirección DMCA registrada es el método más rápido y muy recomendado; también se acepta el correo postal.",
          "Puedes redactar tu aviso en español o en inglés. Incluye suficiente detalle —sobre todo URL exactas o identificadores claros— para que podamos localizar el material sin conjeturas, y conserva una copia para tus registros.",
          "Antes de enviar un aviso, considera si el uso podría estar autorizado, licenciado o permitido por la ley (por ejemplo, uso legítimo o fair use). La Sección 10 explica las consecuencias legales de presentar a sabiendas un aviso falso."
        ]
      },
      {
        "h": "7. Nuestra respuesta a un aviso válido",
        "p": [
          "Al recibir un aviso que cumpla sustancialmente con la Sección 5, actuaremos con prontitud para retirar o inhabilitar el acceso al material identificado en el aviso.",
          "Tomaremos medidas razonables para notificar a la persona afectada que subió el contenido que este ha sido retirado o inhabilitado, y le facilitaremos una copia del aviso de retirada (que puede incluir la identidad y los datos de contacto que proporcionaste) para que pueda presentar una contranotificación si lo desea. Si deseas que se oculten ciertos datos personales antes de reenviar el aviso, indícalo en el propio aviso; sin embargo, no podemos suprimir información que la persona tenga derecho legal a recibir.",
          "Registraremos el aviso a efectos de nuestra política de infractores reincidentes (Sección 11). Podemos, sin estar obligados, informarte del estado. Retirar o inhabilitar material en respuesta a un aviso no constituye una admisión de responsabilidad ni renuncia a ninguna defensa, incluida la de que el aviso era defectuoso o que el uso era lícito."
        ]
      },
      {
        "h": "8. Contranotificación — tu derecho a responder",
        "p": [
          "Si subiste el contenido y tu material fue retirado o inhabilitado a causa de un aviso de retirada, y crees que la retirada se debió a un error o a una identificación equivocada del material, puedes presentar una contranotificación por escrito ante nuestro Agente designado.",
          "Para ser efectiva conforme a 17 U.S.C. § 512(g)(3), tu contranotificación debe incluir sustancialmente lo siguiente: (A) tu firma física o electrónica; (B) la identificación del material retirado o inhabilitado y el lugar en el que aparecía antes de su retirada o inhabilitación; (C) una declaración, bajo pena de perjurio, de que tienes la creencia de buena fe de que el material fue retirado o inhabilitado por error o por una identificación equivocada del material; y (D) tu nombre, dirección y número de teléfono, junto con una declaración de que aceptas la jurisdicción del Tribunal Federal de Distrito de los EE. UU. correspondiente al distrito judicial de tu domicilio (o, si tu domicilio está fuera de los Estados Unidos, de cualquier distrito judicial en el que podamos ser hallados) y de que aceptarás la notificación de emplazamiento de la persona que presentó el aviso original o de su agente.",
          "No presentes una contranotificación para material que no tengas derecho a restaurar —por ejemplo, material que represente a una persona distinta de ti, o contenido íntimo publicado sin el consentimiento de la persona representada—. Tales contranotificaciones serán rechazadas y podrán dar lugar a la terminación de la cuenta y a la denuncia ante las autoridades. Ten en cuenta que el proceso de contranotificación DMCA aborda únicamente los derechos de autor; no restaura material retirado por motivos de derecho de imagen, CINC u otras razones ajenas a los derechos de autor (véanse las Secciones 12–14)."
        ]
      },
      {
        "h": "9. Restauración del material tras una contranotificación",
        "p": [
          "Si recibimos una contranotificación válida, remitiremos con prontitud una copia a la Reclamante que presentó el aviso original y le informaremos de que podemos restaurar el material retirado.",
          "Salvo que la Reclamante notifique a nuestro Agente designado, dentro del plazo legal, que ha interpuesto una acción judicial para obtener una orden que impida a la persona que subió el contenido continuar con la actividad presuntamente infractora, restauraremos o rehabilitaremos el acceso al material retirado en un plazo no inferior a diez (10) ni superior a catorce (14) días hábiles tras la recepción de la contranotificación, conforme a 17 U.S.C. § 512(g)(2).",
          "Podemos negarnos a restaurar material que, con independencia de la contranotificación, vulnere nuestros Términos de servicio o la ley aplicable."
        ]
      },
      {
        "h": "10. Declaraciones falsas y tergiversación (Sección 512(f))",
        "p": [
          "Tanto los avisos de retirada como las contranotificaciones se realizan bajo pena de perjurio. Conforme a 17 U.S.C. § 512(f), toda persona que tergiverse a sabiendas de forma sustancial que un material es infractor, o que un material fue retirado o inhabilitado por error o identificación equivocada, podrá ser responsable de los daños —incluidas costas y honorarios de abogados— sufridos por la presunta infractora, la titular de los derechos de autor, su agente o nosotros, como resultado de nuestra confianza en la tergiversación.",
          "No uses el proceso DMCA para retirar contenido sobre el que no ostentas derechos, para silenciar expresión lícita ni para acosar a otra persona usuaria. El uso indebido de este proceso también puede infringir nuestros Términos de servicio y dar lugar a la terminación de la cuenta."
        ]
      },
      {
        "h": "11. Política de infractores reincidentes y terminación de cuentas",
        "p": [
          "Conforme a 17 U.S.C. § 512(i), hemos adoptado y aplicamos de forma razonable una política que prevé la terminación, en circunstancias apropiadas, de las cuentas de las personas Suscriptoras y titulares de cuenta que sean infractoras reincidentes.",
          "Como pauta general, una persona Suscriptora que sea objeto de dos (2) o más avisos de infracción distintos, válidos y no rebatidos podrá ver su cuenta terminada, y podremos terminarla antes cuando las circunstancias lo justifiquen. Valoramos la totalidad de las circunstancias, incluido si los avisos fueron retirados o rebatidos con éxito mediante contranotificación.",
          "Con independencia del recuento de reincidencia, podemos terminar de forma inmediata y permanente cualquier cuenta por una única infracción grave —incluidas subir, entrenar o generar la imagen de una persona distinta de la titular verificada de la cuenta; cualquier contenido íntimo no consentido; o cualquier contenido que sexualice a un menor—. Las personas cuya cuenta haya sido terminada tienen prohibido abrir o controlar cuentas nuevas, y podemos adoptar medidas técnicas y legales para hacer cumplir esa prohibición."
        ]
      },
      {
        "h": "12. Derecho de imagen y nombre, imagen y apariencia",
        "p": [
          "Con independencia de los derechos de autor, las personas tienen derechos sobre su nombre, imagen, apariencia y —en un número creciente de jurisdicciones— voz, conforme a las leyes estatales de derecho de imagen (right of publicity), privacidad y competencia desleal. Estos derechos existen aunque la persona reclamante no sea titular de derecho de autor alguno sobre el material subyacente, por lo que una reclamación de derecho de imagen no es lo mismo que un aviso de derechos de autor DMCA.",
          "Dado que nuestro Servicio está construido para clonar únicamente la propia imagen verificada y consentida de la creadora, el uso no autorizado de la imagen de un tercero debería ser infrecuente. No obstante, si crees que tu nombre, imagen o apariencia se usa o se genera en el Servicio sin tu autorización, contacta a nuestro Agente designado (Sección 4) o a soporte@letshoot.ai. Facilita información suficiente para identificarte, describe la imagen en cuestión e indícanos dónde aparece.",
          "Revisaremos estos reportes con prontitud. Como conservamos registros de verificación de identidad y de consentimiento de cada creadora, podemos determinar con rapidez si la persona representada es la titular consentida de la cuenta. Si la imagen pertenece a alguien que no consintió, retiraremos el contenido, suspenderemos o terminaremos la cuenta responsable, conservaremos las pruebas pertinentes y, cuando proceda, remitiremos el asunto a las fuerzas del orden."
        ]
      },
      {
        "h": "13. Réplicas digitales, deepfakes y la Ley NO FAKES",
        "p": [
          "Reconocemos el marco legal en rápida evolución que regula las \"réplicas digitales\" generadas por IA. A nivel federal de los EE. UU., el proyecto de Ley NO FAKES crearía un derecho de alcance nacional frente a la creación y distribución no autorizadas de réplicas generadas por IA de la voz o la apariencia visual de una persona, junto con un mecanismo de notificación y retirada inspirado en la DMCA. Varios estados de los EE. UU. ya regulan las réplicas digitales, los medios sintéticos y los deepfakes. Esta Política se actualizará para reflejar los requisitos de notificación y las condiciones de puerto seguro de la Ley NO FAKES si llega a convertirse en ley.",
          "Con independencia del estado actual de cualquier norma en particular, nuestra regla permanente es que nadie puede usar el Servicio para crear o distribuir una réplica digital de ninguna persona real distinta de la creadora consentida y verificada que se representa a sí misma. Para favorecer un uso responsable, el contenido generado puede incorporar señales de procedencia de IA o etiquetado que indique que es generado por IA. Los reportes de que se ha creado o usado una réplica digital de una persona sin su consentimiento se tramitan conforme a las Secciones 12 y 14, de forma acelerada."
        ]
      },
      {
        "h": "14. Contenido íntimo no consentido y la Ley TAKE IT DOWN (retirada en 48 horas)",
        "p": [
          "De forma separada y adicional al proceso de derechos de autor, la Ley TAKE IT DOWN de los EE. UU. exige que las plataformas cubiertas establezcan un proceso para retirar imágenes íntimas no consentidas —incluidas las auténticas y las generadas por IA o \"deepfakes\" (\"CINC\")— dentro de las cuarenta y ocho (48) horas siguientes a la recepción de una solicitud de retirada válida de la persona representada identificable o de su representante autorizado, y que realicen esfuerzos razonables para identificar y retirar copias idénticas.",
          "Si apareces en contenido íntimo del Servicio cuya creación o publicación no consentiste, no necesitas presentar un aviso DMCA ni ser titular de derecho de autor alguno. Contáctanos en soporte@letshoot.ai o a nuestro Agente designado con información razonablemente suficiente para identificarte, para identificar el contenido y dónde aparece, y una declaración de que no consentiste su publicación. Ofrecemos una vía acelerada para estas solicitudes y actuaremos dentro del plazo legal de 48 horas, retiraremos el contenido reportado, adoptaremos medidas contra la cuenta responsable y haremos esfuerzos razonables por retirar las copias conocidas.",
          "Mantenemos una política de tolerancia cero frente a cualquier contenido que sexualice a un menor. Todo material aparente de abuso sexual infantil (CSAM) se retira de inmediato, se conserva según exige la ley y se denuncia al Centro Nacional para Menores Desaparecidos y Explotados (NCMEC) y a las autoridades competentes. Esta categoría nunca está sujeta al proceso ordinario de contranotificación o restauración."
        ]
      },
      {
        "h": "15. Reclamaciones de marcas y otras de propiedad intelectual",
        "p": [
          "Para reclamaciones que no involucren derechos de autor —como marcas, imagen comercial (trade dress), patentes u otros derechos de propiedad intelectual— contacta a nuestro Agente designado (Sección 4) o a soporte@letshoot.ai.",
          "Incluye: tu nombre y datos de contacto; una descripción del derecho que reclamas y, cuando corresponda, el (los) número(s) de registro y la(s) jurisdicción(es); la identificación del material presuntamente infractor y dónde aparece en el Servicio; y una declaración de buena fe de que el uso no está autorizado. Evaluamos las reclamaciones ajenas a los derechos de autor caso por caso y adoptamos las medidas apropiadas, que pueden incluir la retirada, restricciones de cuenta o la solicitud de información adicional."
        ]
      },
      {
        "h": "16. Reportar el uso indebido de tu propia imagen en LetShoot",
        "p": [
          "Las personas creadoras y el público pueden reportar con rapidez un uso indebido de la imagen. Desde tu cuenta puedes usar la opción de reporte integrada donde esté disponible, o escribir a soporte@letshoot.ai o a nuestro Agente designado.",
          "Indícanos quién eres, qué imagen se está usando indebidamente y dónde aparece. Como cada creadora del Servicio tiene la identidad y la edad verificadas y ha firmado consentimientos de creación y publicación, podemos verificar un reporte contra nuestros registros con confianza. Según el resultado, podemos suspender la generación adicional a partir del modelo afectado, retirar el contenido, terminar la cuenta infractora, conservar pruebas para procedimientos legales y notificar a las autoridades."
        ]
      },
      {
        "h": "17. Medidas técnicas estándar y conservación de registros",
        "p": [
          "Conforme a 17 U.S.C. § 512(i), acomodamos y no interferimos con las medidas técnicas estándar utilizadas por las personas titulares de derechos de autor para identificar o proteger sus Obras, siempre que dichas medidas estén disponibles en términos razonables y no discriminatorios y no impongan costos o cargas sustanciales al Servicio.",
          "Tras retirar o inhabilitar material, podemos conservar copias del material retirado, de los avisos y contranotificaciones asociados y de los registros relacionados con fines de cumplimiento, resolución de disputas y retención legal (legal hold), aunque el material ya no sea accesible al público. La conservación y destrucción de datos biométricos y de verificación de identidad asociados a un reporte se rigen por nuestra Política de privacidad y por la legislación aplicable de privacidad biométrica (incluidos, cuando corresponda, el Artículo 9 del RGPD y las leyes biométricas estatales de los EE. UU.), que fijan límites de conservación y plazos de destrucción segura."
        ]
      },
      {
        "h": "18. Buena fe, abuso del proceso y consolidación de avisos",
        "p": [
          "Esperamos que todos los avisos y contranotificaciones se presenten de buena fe. Podemos negarnos a actuar sobre, solicitar aclaraciones de, o consolidar avisos que sean incompletos, duplicados, automatizados a gran escala sin revisión humana significativa, o que aparenten estar diseñados para acosar a una persona usuaria o para suprimir contenido lícito. Un patrón de presentaciones de mala fe o materialmente falsas puede llevarnos a rechazar nuevos avisos de esa persona y, en el caso de titulares de cuenta, a la terminación.",
          "Podemos compartir los avisos y contranotificaciones completos —incluidos los datos de contacto que contengan— con la persona afectada y, cuando la ley lo exija o resulte apropiado, con las fuerzas del orden o un tribunal. Podemos incluir estadísticas sobre avisos, con los datos personales redactados, en cualquier informe de transparencia que decidamos publicar."
        ]
      },
      {
        "h": "19. Avisos internacionales (UE / RU / DSA) y nuestros representantes",
        "p": [
          "Para personas usuarias y titulares de derechos en la Unión Europea, el Espacio Económico Europeo y el Reino Unido, además del proceso DMCA existen mecanismos de notificación y acción conforme a la Ley de Servicios Digitales (DSA) de la UE y a las leyes nacionales equivalentes. Puedes presentar avisos de propiedad intelectual y de contenido ilícito usando los mismos contactos indicados en la Sección 4, y los tramitaremos conforme a los requisitos aplicables de la UE/RU.",
          "Representante en la UE/EEE a efectos de protección de datos (Artículo 27 del RGPD): «[POR DEFINIR: nombre y dirección en la UE del representante de la Compañía conforme al Artículo 27]». Representante en el Reino Unido (Artículo 27 del RGPD del RU): «[POR DEFINIR: nombre y dirección en el RU del representante de la Compañía]».",
          "Los datos personales contenidos en los avisos y contranotificaciones se tratan conforme a nuestra Política de privacidad y a la legislación de protección de datos aplicable. Los datos descritos en un aviso pueden almacenarse y tratarse en los Estados Unidos."
        ]
      },
      {
        "h": "20. Ley aplicable, cambios a esta política y contacto",
        "p": [
          "Esta Política y cualquier disputa que surja de ella se rigen por las leyes del Estado de «[POR DEFINIR: estado de los EE. UU. aplicable]» y por la legislación federal de los EE. UU. aplicable, sin perjuicio de los derechos imperativos de protección al consumidor o de protección de datos que puedas tener conforme a la ley de tu lugar de residencia. La jurisdicción para la contranotificación DMCA descrita en la Sección 8 está fijada por ley y no se ve alterada por esta cláusula.",
          "Podemos actualizar esta Política periódicamente; la versión vigente se identifica por la fecha de \"última actualización\" que la acompaña. El uso continuado del Servicio tras una actualización constituye la aceptación de la Política revisada.",
          "Las preguntas sobre esta Política, o los avisos conforme a ella, deben dirigirse a nuestro Agente designado (Sección 4) para asuntos de derechos de autor y propiedad intelectual, o a soporte@letshoot.ai para todos los demás asuntos. Esta Política es operada por ASM Media Group LLC en relación con letshoot.ai."
        ]
      }
    ]
  },
  "en": {
    "title": "DMCA / IP & Designated Agent Policy",
    "s": [
      {
        "h": "1. Purpose and scope",
        "p": [
          "This DMCA / Intellectual Property and Designated Agent Policy (this \"Policy\") explains how ASM Media Group LLC (\"we,\" \"us,\" \"our,\" or the \"Company\"), operator of the website letshoot.ai and the associated creator portal (together, the \"Service\"), responds to claims of copyright infringement and related intellectual-property and likeness complaints under the United States Digital Millennium Copyright Act, 17 U.S.C. § 512 (the \"DMCA\"), and under related law. This Policy is incorporated into and forms part of our Terms of Service.",
          "The Service lets adult (18+) content creators upload photographs of themselves so that we can train a per-creator artificial-intelligence likeness model (a \"digital clone\" or LoRA) and generate new images and video of that same, consenting creator's own verified likeness, which the creator then distributes and sells on adult platforms. Because of this design, the intellectual-property and likeness disputes we encounter generally fall into two categories: (a) ordinary copyright complaints about photographs, video, or other works, and (b) complaints that a person's name, image, voice, or likeness is being used without authorization. This Policy addresses both, and points to the faster non-copyright channels where those apply.",
          "We honor properly submitted DMCA notices, we act quickly on credible reports that someone's likeness is being misused, and we equally protect our users against false, mistaken, or abusive takedown demands. This document is an operational policy, not legal advice; if you are unsure of your rights or obligations, consult an attorney."
        ]
      },
      {
        "h": "2. Definitions",
        "p": [
          "\"Work\" means any copyrightable material, including photographs, videos, images, text, audio, or software.",
          "\"Copyright owner\" or \"rights holder\" means the owner of an exclusive right under copyright in a Work, or a person authorized to act on that owner's behalf. \"Complainant\" means any person who submits a notice under this Policy.",
          "\"Uploader\" or \"Subscriber\" means the creator or account holder who uploaded, generated, or is otherwise responsible for the material identified in a notice.",
          "\"Designated Agent\" means the agent we have registered with the U.S. Copyright Office to receive DMCA notifications, identified in Section 4.",
          "\"Likeness\" means an individual's recognizable name, image, physical appearance, or (where protected by law) voice. \"Digital replica\" means a computer-generated, AI-assisted, or otherwise synthetic representation of a real person's likeness or voice. \"NCII\" means non-consensual intimate imagery, including authentic and AI-generated (\"deepfake\") intimate imagery published without the depicted person's consent.",
          "\"Business day\" means any day other than a Saturday, Sunday, or U.S. federal public holiday."
        ]
      },
      {
        "h": "3. Our respect for intellectual property and the only-your-own-likeness rule",
        "p": [
          "We require every creator to certify, before the Service is activated, that they are the individual depicted in the uploaded photographs and that they own or control all rights necessary to upload those photographs and to authorize the creation of a digital clone from them. The Service may be used to clone only your own verified likeness. Requesting, uploading, training on, or generating the likeness of any other real person is strictly prohibited and is grounds for immediate termination and, where warranted, referral to authorities.",
          "Because we act as the producer of the intimate content generated on the platform (including for purposes of the recordkeeping obligations under 18 U.S.C. §§ 2257–2257A), we maintain government-ID and age-verification records and signed consents establishing that the person depicted is an adult who consented to both the creation and the publication of content built from their likeness. These records let us resolve most copyright and right-of-publicity disputes quickly and reliably.",
          "Nothing in this Policy limits our right to remove or disable any content, or to suspend or terminate any account, at our discretion where we believe our Terms of Service, applicable law, or the rights of a third party have been violated."
        ]
      },
      {
        "h": "4. Designated Copyright Agent",
        "p": [
          "We have designated and registered an agent with the U.S. Copyright Office to receive notifications of claimed copyright infringement. All DMCA takedown notices and counter-notifications should be sent to our Designated Agent using the contact details below.",
          "Designated Copyright Agent: «[TO BE SET: full name and/or title of the DMCA Designated Agent, e.g., 'Copyright Agent, ASM Media Group LLC']».",
          "Mailing address: «[TO BE SET: physical street address in the United States registered with the U.S. Copyright Office DMCA Designated Agent Directory]».",
          "Email: «[TO BE SET: dedicated DMCA email address registered with the U.S. Copyright Office]». Telephone: «[TO BE SET: telephone number registered with the U.S. Copyright Office]».",
          "U.S. Copyright Office DMCA Designated Agent registration: «[TO BE SET: Copyright Office Directory registration/entry reference and effective date]».",
          "This channel is for copyright and other intellectual-property or likeness matters only. General support, billing questions, and other correspondence should be sent to soporte@letshoot.ai. Notices misdirected to the wrong channel may be delayed and may not be treated as effective on the date received."
        ]
      },
      {
        "h": "5. Filing a DMCA takedown notice — required elements",
        "p": [
          "If you are a copyright owner or authorized agent and you believe a Work has been copied and made available through the Service in a way that constitutes infringement, you may submit a written takedown notice to our Designated Agent. To be effective under 17 U.S.C. § 512(c)(3), your notice must include substantially all of the following six elements.",
          "(1) A physical or electronic signature of a person authorized to act on behalf of the owner of the exclusive right that is allegedly infringed.",
          "(2) Identification of the copyrighted Work claimed to have been infringed, or, if multiple Works are covered by a single notice, a representative list of those Works.",
          "(3) Identification of the material that is claimed to be infringing or to be the subject of infringing activity, and information reasonably sufficient to permit us to locate the material — for example, the specific URL(s), file name(s), or page(s) on the Service where it appears.",
          "(4) Information reasonably sufficient to permit us to contact you, such as your full name, mailing address, telephone number, and email address.",
          "(5) A statement that you have a good-faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.",
          "(6) A statement that the information in the notice is accurate, and — under penalty of perjury — that you are the copyright owner or are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.",
          "A notice that fails to substantially comply with all of these elements may not be treated as effective and may not, by itself, give rise to our obligation to act; however, if a notice is defective only as to elements (2), (3), or (4), we will take reasonable steps to contact you or otherwise obtain the missing information."
        ]
      },
      {
        "h": "6. How and where to send your notice",
        "p": [
          "Send your notice to the Designated Agent identified in Section 4. Email to the registered DMCA address is the fastest method and is strongly preferred; postal mail is also accepted.",
          "You may write your notice in English or Spanish. Please include enough detail — especially exact URLs or clear identifiers — for us to locate the material without guesswork, and keep a copy for your records.",
          "Before you send a notice, please consider whether the use might be authorized, licensed, or permitted by law (for example, fair use). Section 10 explains the legal consequences of knowingly submitting a false notice."
        ]
      },
      {
        "h": "7. Our response to a valid notice",
        "p": [
          "Upon receiving a notice that substantially complies with Section 5, we will act expeditiously to remove or disable access to the material identified in the notice.",
          "We will take reasonable steps to notify the affected Uploader that the material has been removed or disabled, and we will provide the Uploader with a copy of the takedown notice (which may include the identity and contact information you provided) so that they may submit a counter-notification if they choose. If you wish certain personal details to be redacted before we forward the notice, tell us in the notice; we cannot, however, remove information the Uploader is legally entitled to receive.",
          "We will record the notice for purposes of our repeat-infringer policy (Section 11). We may, but are not obligated to, provide you with a status update. Removing or disabling material in response to a notice is not an admission of liability and does not waive any defense, including that the notice was defective or that the use was lawful."
        ]
      },
      {
        "h": "8. Counter-notification — your right to respond",
        "p": [
          "If you are an Uploader and your material was removed or disabled as a result of a takedown notice, and you believe the removal was the result of a mistake or misidentification of the material, you may submit a written counter-notification to our Designated Agent.",
          "To be effective under 17 U.S.C. § 512(g)(3), your counter-notification must include substantially all of the following: (A) your physical or electronic signature; (B) identification of the material that was removed or disabled and the location at which it appeared before it was removed or disabled; (C) a statement, under penalty of perjury, that you have a good-faith belief that the material was removed or disabled as a result of mistake or misidentification of the material; and (D) your name, address, and telephone number, together with a statement that you consent to the jurisdiction of the U.S. Federal District Court for the judicial district in which your address is located (or, if your address is outside the United States, for any judicial district in which we may be found), and that you will accept service of process from the person who submitted the original notice or that person's agent.",
          "Do not submit a counter-notification for material you are not entitled to restore — for example, material that depicts a person other than yourself, or intimate content published without the depicted person's consent. Such counter-notices will be rejected and may lead to account termination and referral to authorities. Note that the DMCA counter-notice process addresses copyright only; it does not restore material that was removed for right-of-publicity, NCII, or other non-copyright reasons (see Sections 12–14)."
        ]
      },
      {
        "h": "9. Restoration of material after a counter-notification",
        "p": [
          "If we receive a valid counter-notification, we will promptly forward a copy to the Complainant who submitted the original notice and inform them that we may restore the removed material.",
          "Unless the Complainant notifies our Designated Agent, within the statutory period, that they have filed a court action seeking a court order to restrain the Uploader from engaging in the allegedly infringing activity, we will restore or re-enable access to the removed material in not less than ten (10) and not more than fourteen (14) business days following our receipt of the counter-notification, consistent with 17 U.S.C. § 512(g)(2).",
          "We may decline to restore material that independently violates our Terms of Service or applicable law, regardless of the counter-notification."
        ]
      },
      {
        "h": "10. False statements and misrepresentation (Section 512(f))",
        "p": [
          "Both takedown notices and counter-notifications are made under penalty of perjury. Under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material is infringing, or that material was removed or disabled by mistake or misidentification, may be liable for damages — including costs and attorneys' fees — incurred by the alleged infringer, the copyright owner, the owner's agent, or us, as a result of our reliance on the misrepresentation.",
          "Do not use the DMCA process to remove content you do not hold rights in, to silence lawful speech, or to harass another user. Misuse of this process may also violate our Terms of Service and result in account termination."
        ]
      },
      {
        "h": "11. Repeat-infringer policy and account termination",
        "p": [
          "Consistent with 17 U.S.C. § 512(i), we have adopted and reasonably implement a policy providing for the termination, in appropriate circumstances, of the accounts of Subscribers and account holders who are repeat infringers.",
          "As a general guideline, a Subscriber who is the subject of two (2) or more separate, valid, and unrebutted infringement notices may have their account terminated, and we may terminate at an earlier point where circumstances warrant. We weigh the totality of the circumstances, including whether notices were withdrawn or successfully rebutted by counter-notification.",
          "Independently of the repeat-infringer count, we may immediately and permanently terminate any account for a single egregious violation — including uploading, training on, or generating the likeness of a person other than the verified account holder; any non-consensual intimate imagery; or any content that sexualizes a minor. Terminated users are prohibited from opening or controlling new accounts, and we may take technical and legal measures to enforce that prohibition."
        ]
      },
      {
        "h": "12. Right of publicity and name, image, and likeness",
        "p": [
          "Independently of copyright, individuals have rights in their name, image, likeness, and — in a growing number of jurisdictions — voice, under state right-of-publicity, privacy, and unfair-competition laws. These rights exist even when the complaining person does not own any copyright in the underlying material, so a right-of-publicity or likeness complaint is not the same as a DMCA copyright notice.",
          "Because our Service is built to clone only the consenting creator's own verified likeness, unauthorized use of a third party's likeness should be rare. If, however, you believe your name, image, or likeness is being used on or generated by the Service without your authorization, contact our Designated Agent (Section 4) or soporte@letshoot.ai. Please provide enough information to identify yourself, describe the likeness at issue, and point us to where it appears.",
          "We will review such reports promptly. Because we hold identity-verification and consent records for every creator, we can quickly determine whether the person depicted is the consenting account holder. If the likeness belongs to someone who did not consent, we will remove the content, suspend or terminate the responsible account, preserve relevant evidence, and, where appropriate, refer the matter to law enforcement."
        ]
      },
      {
        "h": "13. Digital replicas, deepfakes, and the NO FAKES Act",
        "p": [
          "We recognize the rapidly developing legal framework governing AI-generated \"digital replicas.\" At the U.S. federal level, the proposed NO FAKES Act would create a nationwide right against the unauthorized creation and distribution of AI-generated replicas of a person's voice or visual likeness, together with a notice-and-takedown mechanism modeled on the DMCA. A number of U.S. states already regulate digital replicas, synthetic media, and deepfakes. This Policy will be updated to reflect the NO FAKES Act's specific notice requirements and safe-harbor conditions if and when it becomes law.",
          "Regardless of the current status of any particular statute, our standing rule is that no one may use the Service to create or distribute a digital replica of any real person other than the consenting, verified creator depicting themselves. To support responsible use, generated content may carry AI-provenance signals or labeling indicating that it is AI-generated. Reports that a digital replica of a person has been created or used without that person's consent are handled under Sections 12 and 14, on an expedited basis."
        ]
      },
      {
        "h": "14. Non-consensual intimate imagery and the TAKE IT DOWN Act (48-hour removal)",
        "p": [
          "Separately from and in addition to the copyright process, the U.S. TAKE IT DOWN Act requires covered platforms to establish a process to remove non-consensual intimate imagery — including authentic imagery and AI-generated or \"deepfake\" intimate imagery (\"NCII\") — within forty-eight (48) hours of receiving a valid removal request from the identifiable depicted individual or that individual's authorized representative, and to make reasonable efforts to identify and remove identical copies.",
          "If you are depicted in intimate content on the Service that you did not consent to have created or published, you do not need to file a DMCA notice and you do not need to own any copyright. Contact us at soporte@letshoot.ai or our Designated Agent with information reasonably sufficient to identify you, to identify the content and where it appears, and a statement that you did not consent to its publication. We provide an expedited path for these requests and will act within the statutory 48-hour window, remove the reported content, take account action against the responsible user, and make reasonable efforts to remove known copies.",
          "We maintain a zero-tolerance policy toward any content that sexualizes a minor. Any apparent child sexual abuse material (CSAM) is removed immediately, preserved as required by law, and reported to the National Center for Missing & Exploited Children (NCMEC) and to appropriate authorities. This category is never subject to the ordinary counter-notification or restoration process."
        ]
      },
      {
        "h": "15. Trademark and other intellectual-property complaints",
        "p": [
          "For complaints that do not involve copyright — such as trademark, trade-dress, patent, or other intellectual-property claims — contact our Designated Agent (Section 4) or soporte@letshoot.ai.",
          "Please include: your name and contact information; a description of the right you claim and, where applicable, the registration number(s) and jurisdiction(s); identification of the allegedly infringing material and where it appears on the Service; and a good-faith statement that the use is unauthorized. We evaluate non-copyright complaints case by case and take appropriate action, which may include removal, account restrictions, or requesting further information."
        ]
      },
      {
        "h": "16. Reporting misuse of your own likeness on LetShoot",
        "p": [
          "Creators and members of the public can report suspected likeness misuse quickly. From within your account you can use the in-product reporting option where available, or write to soporte@letshoot.ai or our Designated Agent.",
          "Tell us who you are, what likeness is being misused, and where it appears. Because every creator on the Service is identity- and age-verified and has signed create-and-publish consents, we can verify a report against our records with confidence. Depending on the outcome, we may suspend further generation from the affected model, remove the content, terminate the offending account, preserve evidence for legal proceedings, and notify authorities."
        ]
      },
      {
        "h": "17. Standard technical measures and preservation of records",
        "p": [
          "Consistent with 17 U.S.C. § 512(i), we accommodate and do not interfere with standard technical measures used by copyright owners to identify or protect their Works, where such measures are available on reasonable and non-discriminatory terms and do not impose substantial costs or burdens on the Service.",
          "After we remove or disable material, we may retain copies of the removed material, the associated notices and counter-notices, and related logs for compliance, dispute-resolution, and legal-hold purposes, even though the material is no longer publicly accessible. Retention and destruction of biometric and identity-verification data associated with a report are governed by our Privacy Policy and applicable biometric-privacy law (including, where applicable, GDPR Article 9 and U.S. state biometric statutes), which specify retention limits and secure-destruction timelines."
        ]
      },
      {
        "h": "18. Good faith, abuse of process, and consolidation of notices",
        "p": [
          "We expect all notices and counter-notices to be submitted in good faith. We may decline to act on, request clarification of, or consolidate notices that are incomplete, duplicative, automated at scale without meaningful human review, or that appear designed to harass a user or suppress lawful content. A pattern of bad-faith or materially false submissions may result in our refusing further notices from the sender and, for account holders, in termination.",
          "We may share complete notices and counter-notices — including the contact information they contain — with the affected user, and, where legally required or appropriate, with law enforcement or a court. We may include statistics about notices, with personal data redacted, in any transparency reporting we choose to publish."
        ]
      },
      {
        "h": "19. International notices (EU / UK / DSA) and our representatives",
        "p": [
          "For users and rights holders in the European Union, the European Economic Area, and the United Kingdom, notice-and-action mechanisms under the EU Digital Services Act (DSA) and equivalent national laws are available in addition to the DMCA process. You may submit intellectual-property and illegal-content notices using the same contacts identified in Section 4, and we will handle them in accordance with the applicable EU/UK requirements.",
          "EU/EEA representative for data-protection purposes (GDPR Article 27): «[TO BE SET: name and EU address of the Company's Article 27 representative]». United Kingdom representative (UK GDPR Article 27): «[TO BE SET: name and UK address of the Company's UK representative]».",
          "Personal data contained in notices and counter-notices is processed in accordance with our Privacy Policy and applicable data-protection law. Data described in a notice may be stored and processed in the United States."
        ]
      },
      {
        "h": "20. Governing law, changes to this policy, and contact",
        "p": [
          "This Policy and any dispute arising out of it are governed by the laws of the State of «[TO BE SET: governing-law U.S. state]» and applicable U.S. federal law, without prejudice to any mandatory consumer-protection or data-protection rights you may have under the law of your place of residence. The DMCA counter-notification jurisdiction described in Section 8 is fixed by statute and is not altered by this clause.",
          "We may update this Policy from time to time; the current version is identified by the \"last updated\" date shown with it. Continued use of the Service after an update constitutes acceptance of the revised Policy.",
          "Questions about this Policy, or notices under it, should be directed to our Designated Agent (Section 4) for copyright and IP matters, or to soporte@letshoot.ai for all other matters. This Policy is operated by ASM Media Group LLC in connection with letshoot.ai."
        ]
      }
    ]
  }
};

export default function DmcaPage() {
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
