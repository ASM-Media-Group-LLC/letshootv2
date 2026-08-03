'use client';

// Auto-assembled legal page. DRAFT — must be reviewed by an attorney before publishing.
// Bilingual ES/EN via useLegalLang(). Placeholders marked [POR DEFINIR / TO BE SET].
import LegalPage, { Section, useLegalLang } from '@/components/LegalPage';

const C = {
  "es": {
    "title": "Política de Uso Aceptable y Contenido Prohibido",
    "s": [
      {
        "h": "1. Objeto, alcance y relación con nuestras demás políticas",
        "p": [
          "Esta Política de Uso Aceptable y Contenido Prohibido (la \"Política\") rige todo uso de letshoot.ai y de la plataforma, el portal, las herramientas y las API de LetShoot (en conjunto, el \"Servicio\"), operados por ASM Media Group LLC (\"LetShoot\", \"nosotros\"). Aplica a toda persona titular de una cuenta, creadora, agencia, integrante de equipo, y a cualquiera que suba material al Servicio, genere contenido a través de él o acceda de otro modo (\"tú\").",
          "El Servicio existe con un propósito único y acotado: que personas creadoras de contenido para adultos verificadas (mayores de 18 años) suban fotografías de sí mismas para que podamos entrenar un modelo de inteligencia artificial de la imagen de esa misma persona consintiente (un LoRA o \"clon digital\"), y generar nuevas imágenes y videos para adultos de la propia imagen verificada de la persona creadora, que esta podrá vender en plataformas de contenido para adultos de terceros. Todo uso ajeno a ese propósito está prohibido.",
          "Esta Política se incorpora y forma parte de nuestros Términos de servicio, y debe leerse junto con nuestra Política de Privacidad y Datos Biométricos, nuestra Declaración de cumplimiento 18 U.S.C. § 2257 y nuestra Política de Consentimiento y Generación de Contenido. Cuando esta Política sea más estricta que otro documento, prevalece la regla más estricta. Los términos en mayúscula no definidos aquí tienen el significado que se les da en los Términos de servicio.",
          "Aplicamos esta Política con el mismo estándar en todos los lugares donde operamos, con independencia de dónde se encuentre la persona creadora o quien visualiza el contenido. En algunas jurisdicciones nuestras reglas son más estrictas que la ley local; es intencional. Nada de lo aquí expuesto constituye asesoría legal para ti."
        ]
      },
      {
        "h": "2. Regla fundamental — solo tu propia imagen verificada",
        "p": [
          "Puedes crear, entrenar y generar contenido usando una única imagen: la tuya. Antes de entrenar cualquier modelo verificamos tu identidad y tu edad con un documento de identidad oficial con foto y una selfie de comprobación con prueba de vida, y vinculamos tu cuenta a esa identidad verificada. Cada imagen de entrenamiento que subas debe mostrarte a ti, la misma persona verificada, y a nadie más como sujeto.",
          "No puedes subir, solicitar, entrenar ni generar contenido que muestre a ninguna otra persona real e identificable — ya sea una celebridad, una expareja, una amistad, una persona con quien trabajas, una persona desconocida, otra creadora, un \"face-swap\" compuesto, o una imagen aparentemente ficticia que en realidad se base en una persona real. Solicitar un clon de cualquier persona distinta a ti misma es una infracción grave y, según el contenido, puede además constituir un delito.",
          "El contenido en grupo, en dueto o con \"pareja de escena\" solo se permite cuando toda imagen humana que aparezca sea (a) tu propia imagen verificada, o (b) otra persona creadora adulta, consintiente y verificada por separado, que tenga una cuenta activa en LetShoot y haya firmado un consentimiento específico para esa colaboración exacta, documentado a través del Servicio. Las \"parejas\" totalmente sintéticas y no reales quedan sujetas a las mismas reglas de edad, no representación de menores y temáticas de las Secciones 5 a 9. Eres responsable de asegurar que ningún tercero real quede reconociblemente reproducido en el fondo, en pantallas, en reflejos o en cualquier elemento incidental de una imagen generada.",
          "Está prohibido añadir texto, marcas de agua, leyendas o metadatos que atribuyan falsamente el contenido a otra persona, o que sugieran que un tercero real participó cuando no fue así."
        ]
      },
      {
        "h": "3. El consentimiento para crear no es consentimiento para publicar",
        "p": [
          "Tratamos la creación de contenido y la publicación de contenido como dos actos separados, cada uno con su propio fundamento. Tu consentimiento firmado en el alta nos autoriza a construir y operar tu clon digital y a generar contenido para ti. Por sí solo, no autoriza la distribución pública de ninguna imagen o video en particular.",
          "Eres la única responsable de dónde, si es que lo haces, y cómo publicas o vendes el contenido que te entregamos, y de cumplir con los términos, las reglas de edad, las reglas de etiquetado y las reglas de contenido prohibido de cada plataforma de terceros en la que publiques. Un contenido que sea aceptable generar para revisión privada puede seguir siendo inaceptable para publicar en una plataforma determinada.",
          "Puedes retirar o acotar tu consentimiento en cualquier momento según se describe en nuestra Política de Consentimiento y Generación de Contenido y en la Política de Privacidad y Datos Biométricos. El retiro detiene la generación futura y activa la eliminación de tus datos de entrenamiento y de tu modelo en los plazos indicados en dichas políticas, pero no puede recuperar retroactivamente el contenido que ya descargaste, publicaste o vendiste."
        ]
      },
      {
        "h": "4. Revisión previa a la publicación y nuestro rol como productor",
        "p": [
          "Como somos quienes generamos el contenido, LetShoot (ASM Media Group LLC) actúa como productor de registro (\"producer\") de las imágenes y videos creados a través del Servicio y mantiene registros de verificación de edad y consentimiento de la persona verificada representada, según se describe en nuestra Declaración de cumplimiento 18 U.S.C. § 2257. Custodio de registros y domicilio de inspección: «[POR DEFINIR: nombre legal del Custodio de Registros y domicilio físico en EE. UU.]».",
          "Toda solicitud de generación está sujeta a revisión antes de que el contenido se finalice y se libere para tu descarga. La revisión combina filtrado automatizado (incluida la revisión de prompts, clasificadores de desnudez/edad y cotejo de huellas [hash] contra bases de datos de contenido ilegal conocido) con moderación humana de los elementos marcados. Podemos retener, rechazar, bloquear o eliminar cualquier solicitud o resultado que infrinja esta Política, y podemos hacerlo antes, durante o después de la generación.",
          "Superar la revisión no constituye una aprobación, una autorización legal, ni una garantía de que el contenido cumpla con las reglas de ninguna plataforma de terceros o con la ley de una jurisdicción concreta. La revisión es un control de seguridad y cumplimiento operado para los fines de LetShoot; la responsabilidad última de que las solicitudes sean lícitas y conformes con la Política sigue siendo tuya.",
          "Podemos volver a revisar en cualquier momento contenido previamente generado, incluso de forma retroactiva cuando cambien las herramientas de detección, las reglas de las redes de tarjetas o las obligaciones legales."
        ]
      },
      {
        "h": "5. Contenido de tolerancia cero — menores, regresión de edad y apariencia de minoría de edad (CSAM)",
        "p": [
          "Tenemos tolerancia cero absoluta con cualquier contenido que sexualice, o aparente sexualizar, a una persona menor de edad. Es la regla más importante de la plataforma y no admite excepción alguna, ni argumento artístico, ni encuadre de juego de roles, ni la defensa de que \"es solo IA\".",
          "Queda estricta y permanentemente prohibido: (a) todo contenido sexual o de desnudez que represente a una persona real menor de 18 años; (b) todo contenido generado por IA, dibujado, renderizado, morfeado o \"virtual\" que represente, o esté diseñado para aparentar que representa, a una persona menor en un contexto sexual o de desnudez, incluidos personajes totalmente sintéticos; (c) generaciones de regresión de edad o \"rejuvenecimiento\" que hagan que tu propia imagen adulta verificada aparente ser la de una persona menor; (d) contenido estilizado para sugerir a una persona menor —por ejemplo cuerpos infantilizados, escenarios escolares o de guardería, juguetes, chupetes, frenillos, o el encuadre de \"apenas legal\"/\"teen\" que represente o insinúe a una persona menor de 18 años; y (e) todo prompt, leyenda, etiqueta o metadato que solicite, describa o comercialice cualquiera de lo anterior.",
          "Conforme a la ley de EE. UU., dicho material es material de abuso sexual infantil (CSAM) y, según el contenido y la jurisdicción, también puede constituir representaciones visuales obscenas del abuso sexual de menores. No exigimos que una solicitud \"tenga éxito\" para actuar: intentar generar este contenido es en sí mismo una infracción que conlleva la terminación.",
          "Cuando detectamos aparente CSAM o intentos de producirlo: bloqueamos y preservamos de inmediato el material y los datos de la cuenta asociados conforme a 18 U.S.C. § 2258A y a la ley aplicable; reportamos al National Center for Missing & Exploited Children (NCMEC) a través de la CyberTipline; terminamos de forma permanente la cuenta y el acceso de la persona; y cooperamos con las autoridades, incluida la conservación de pruebas durante el periodo de retención legal. No damos aviso previo de un reporte y no aplicamos ningún esquema de \"advertir y permitir\" en esta categoría."
        ]
      },
      {
        "h": "6. Contenido no consentido y abuso sexual basado en imágenes",
        "p": [
          "Todo contenido en el Servicio debe representar únicamente el consentimiento plenamente informado y libremente otorgado de la o las personas verificadas cuya imagen aparece. Está prohibido el contenido que represente, sexualice, o esté diseñado para aparentar que representa, la falta de consentimiento, y está prohibido el contenido que reproduzca a una persona real sin su consentimiento.",
          "El contenido no consentido prohibido incluye, sin limitación: (a) toda representación de violación, agresión sexual, sexo \"forzado\" o coerción presentada como real o como tema de la escena; (b) contenido que represente a una persona dormida, inconsciente, drogada, en fuerte estado de intoxicación, hipnotizada o de otro modo incapacitada y por ello incapaz de consentir; (c) \"porno de venganza\", material filtrado, hackeado, de cámara oculta, upskirt, voyerista u obtenido de forma subrepticia; (d) sextorsión o cualquier contenido producido bajo amenaza, chantaje o coacción; y (e) todo deepfake, face-swap o contenido basado en imagen que reproduzca a una persona real e identificable que no haya verificado y consentido personalmente a través del Servicio (ver Sección 2).",
          "No puedes subir imágenes privadas de otra persona para que sean clonadas, morfeadas, \"desnudadas\" o insertadas en contenido generado, aunque afirmes tener su permiso — el único permiso que aceptamos es el consentimiento propio, verificado y documentado, otorgado por esa persona directamente a LetShoot.",
          "Las representaciones consentidas de dinámicas de fantasía entre personas adultas verificadas solo podrán permitirse cuando sean claramente consentidas dentro de la escena y no estén prohibidas de otro modo por las Secciones 5, 8 o 9 ni por las reglas de nuestros socios de pago; cuando una temática sea ambigua, la trataremos como prohibida."
        ]
      },
      {
        "h": "7. Imagen de terceros, suplantación y personas no autorizadas",
        "p": [
          "No puedes suplantar a ninguna persona o entidad, ni generar contenido que sugiera falsamente la participación, el respaldo o la autoría de una persona real. Esto incluye generar contenido \"al estilo de\", \"como\" o parecido a una celebridad, figura pública, influencer o particular con nombre determinado.",
          "No puedes subir imágenes de referencia, prompts o descripciones de texto destinadas a orientar una generación hacia la imagen, los rasgos distintivos, los tatuajes o las marcas identificatorias de cualquier persona real distinta a ti (o de una pareja de escena coverificada conforme a la Sección 2).",
          "Eres responsable de los terceros que aparezcan de forma incidental en las fotografías que subes (por ejemplo, personas visibles en un espejo, una ventana, una foto dentro de la foto, o el fondo). Elimínalos u ocúltalos por completo antes de subir; podemos rechazar cargas que contengan rostros no verificados.",
          "No pueden usarse marcas comerciales, logotipos, uniformes (incluidos los que impliquen de forma engañosa autoridad policial, militar o médica) ni otros identificadores de marca o institucionales de manera que infrinjan derechos o induzcan a error a quien visualiza el contenido."
        ]
      },
      {
        "h": "8. Temáticas y actos prohibidos",
        "p": [
          "Las siguientes temáticas y representaciones están prohibidas en el Servicio, tanto como resultado generado como en tanto objeto de prompts, etiquetas, títulos o marketing, por ser ilegales en jurisdicciones relevantes, por estar prohibidas por nuestras redes de tarjetas y procesadores de pago, o por ambas razones. Esta lista es ilustrativa, no exhaustiva; podemos prohibir categorías adicionales para mantener el cumplimiento de la ley aplicable y de nuestros socios de pago.",
          "(a) Incesto y contenido familiar — toda representación, descripción o temática de actividad sexual entre parientes consanguíneos, incluido el \"pseudoincesto\" o el encuadre de familia política presentado como una relación familiar. (b) Bestialismo / zoofilia — todo contenido sexual que involucre animales o criaturas de aspecto animal. (c) Necrofilia y \"snuff\" — toda sexualización de la muerte, de cadáveres, o contenido que represente o simule la muerte de una persona. (d) Contenido cercano a la minoría de edad o de \"age-play\" de cualquier tipo (ver Sección 5, que rige de forma absoluta).",
          "(e) Temáticas de no consentimiento según se describe en la Sección 6, incluidos los escenarios de personas drogadas, inconscientes, hipnotizadas o \"forzadas\". (f) Violencia extrema, tortura, mutilación, desmembramiento, lesiones corporales graves o permanentes, canibalismo, o contenido cuyo propósito principal sea representar dolor o gore. (g) Armas usadas para amenazar, coaccionar o infligir daño no consentido en un contexto sexual. (h) Juegos de respiración, estrangulamiento o asfixia representados como no consentidos o que pongan en peligro la vida.",
          "(i) Escatología/coprofilia y otros contenidos de desechos corporales en la medida en que estén restringidos por nuestros procesadores de pago. (j) Contenido que represente o promueva autolesiones, suicidio o trastornos alimentarios en un contexto sexualizado. (k) Todo contenido sexual basado en el odio que deshumanice a una persona o grupo por una característica protegida. Dado que las reglas de los procesadores de pago varían y se actualizan con frecuencia, ciertas categorías de fetiche (por ejemplo, algunos watersports, BDSM intenso o contenido de fluidos) pueden estar condicionalmente restringidas; la lista vigente que rige es «[POR DEFINIR: procesador(es) de pago vigente(s) y la versión/fecha de su lista publicada de contenido prohibido]»."
        ]
      },
      {
        "h": "9. Contenido ilegal, explotador y dañino prohibido",
        "p": [
          "No puedes usar el Servicio para crear, solicitar, promover o facilitar contenido que sea ilegal, o que represente, publicite o solicite conductas ilegales. Esto incluye, sin limitación: trata de personas, explotación sexual o cualquier contenido vinculado a la trata o la coerción; prostitución, oferta de servicios de acompañantes (escort) o venta de servicios sexuales presenciales; venta, uso o promoción de drogas ilegales; y toda actividad que infrinja las leyes aplicables sobre obscenidad, explotación o conducta sexual.",
          "No puedes usar el Servicio para acosar, amenazar, acechar, hacer doxing, difamar o poner en peligro a ninguna persona, ni para producir contenido destinado a intimidar o extorsionar.",
          "No puedes usar el contenido generado para fraude, catfishing, estafas amorosas, perfiles falsos de citas o de fans, creación de identidades sintéticas, o para engañar a cualquier persona sobre con quién está interactuando.",
          "No puedes subir malware, intentar acceder a cuentas o datos que no sean tuyos, extraer datos (scraping) o realizar ingeniería inversa de los modelos o del Servicio, eludir los controles de moderación o de seguridad, revender o sublicenciar el acceso al Servicio sin un acuerdo escrito, ni usar el Servicio para construir, entrenar o comparar (benchmark) un modelo de imagen competidor."
        ]
      },
      {
        "h": "10. Cumplimiento de redes de tarjetas y procesadores (Visa, Mastercard, Segpay)",
        "p": [
          "El Servicio y el contenido generado a través de él deben cumplir en todo momento las reglas de las redes de tarjetas y los procesadores de pago que utilizamos para aceptar pagos, incluidas Visa (incluido su Global Brand Protection Program y sus estándares para comercios que facilitan contenido para adultos), Mastercard (incluidos los requisitos de su Specialty Merchant Registration Program para contenido para adultos) y nuestro(s) procesador(es) de pago especializado(s) en contenido para adultos, que pueden incluir a Segpay, CCBill, Epoch u otro procesador autorizado.",
          "En cumplimiento de esas reglas, y de forma coherente con el resto de esta Política: (a) toda persona representada está verificada en edad e identidad y cuenta con consentimiento documentado y revocable; (b) todo el contenido se revisa antes de liberarse; (c) el contenido ilegal —ante todo el CSAM y el contenido no consentido— está absolutamente prohibido, se bloquea y se reporta; (d) mantenemos un proceso monitoreado de quejas y retiro (Secciones 16-17); y (e) conservamos los registros que exigen las redes y los procesadores, y cooperamos con sus auditorías y requerimientos.",
          "Si una red de tarjetas o un procesador de pago actualiza sus estándares de contenido prohibido, dichos estándares actualizados te aplican automáticamente en cuanto los adoptemos, y pueden restringir lo permitido por esta Política sin previo aviso. Las quejas sujetas a las reglas del procesador se acusarán de recibo y se resolverán dentro de «[POR DEFINIR: plazo de acuse/resolución de quejas exigido por el/los procesador(es) vigente(s), p. ej., 7 días hábiles]».",
          "El contenido que las redes de tarjetas exijan prohibir estará prohibido en el Servicio aunque, de otro modo, fuera lícito en una jurisdicción determinada."
        ]
      },
      {
        "h": "11. Procedencia de IA, etiquetado y divulgación",
        "p": [
          "Todo el contenido producido a través del Servicio es contenido sintético creado por inteligencia artificial a partir de tu imagen verificada. No puedes presentar el contenido generado como una fotografía inalterada o como registro documental de un hecho que no ocurrió cuando ello induzca a error a quien lo visualiza, lo defraude, o infrinja las reglas de divulgación de una plataforma o de la ley aplicable.",
          "Podemos incorporar y conservar señales de procedencia en el contenido entregado —por ejemplo, credenciales de contenido/metadatos (como manifiestos de tipo C2PA), marcas de agua visibles o invisibles, o etiquetas de modelo— para respaldar la autenticidad y la detección de abusos. No puedes eliminar, alterar ni falsificar estas señales de procedencia, y no debes presentar contenido de terceros como producido por LetShoot.",
          "Cuando una plataforma de terceros, una regla publicitaria o una ley (incluidos los requisitos emergentes de transparencia de IA y de divulgación de medios sintéticos) exija que el contenido sexual generado o alterado por IA se etiquete como tal, eres responsable de aplicar esa etiqueta al publicar. Recomendamos, como buena práctica por defecto, una divulgación clara de \"generado por IA\"."
        ]
      },
      {
        "h": "12. Conducta prohibida en la plataforma y uso técnico indebido",
        "p": [
          "Más allá del contenido, se prohíbe la siguiente conducta: crear más de una cuenta para eludir la verificación, la suspensión o los límites; compartir, vender o transferir tu cuenta o tu modelo entrenado a otra persona; presentar documentos de verificación falsos o documentos de identidad de otra persona; y usar medios automatizados para sobrecargar, sondear o interrumpir el Servicio.",
          "No puedes intentar hacer jailbreak, inyección de prompts (prompt-injection), ni manipular de otro modo nuestros sistemas de moderación, seguridad o clasificación de edad, ni inducir a los modelos a producir contenido prohibido por las Secciones 5 a 9. Los intentos de hacerlo son en sí mismos infracciones, con independencia de que tengan éxito.",
          "No puedes usar el Servicio de manera que infrinja derechos de propiedad intelectual, se apropie indebidamente del nombre, imagen o semejanza (NIL) o del derecho de publicidad de otra persona, o incumpla cualquier contrato o término de plataforma al que estés sujeta."
        ]
      },
      {
        "h": "13. Detección y moderación",
        "p": [
          "Utilizamos una combinación de sistemas automatizados y humanos para hacer cumplir esta Política, incluida la revisión de prompts y leyendas, clasificadores de imagen para desnudez y edad aparente, y cotejo de huellas (hash) del material subido y generado contra bases de datos del sector de contenido ilegal conocido. El material marcado se deriva a personas revisoras humanas capacitadas.",
          "Podemos registrar prompts, cargas, resultados y actividad de la cuenta según sea necesario para operar estos controles, investigar presuntas infracciones, cumplir obligaciones de conservación de registros y responder a requerimientos legales. El tratamiento de estos datos —incluidos los datos biométricos— se describe en nuestra Política de Privacidad y Datos Biométricos.",
          "La detección automatizada es imperfecta y puede marcar de más o de menos; la revisión humana, las acciones sobre la cuenta y el reporte obligatorio se superponen precisamente porque ningún control aislado es suficiente para esta categoría de contenido."
        ]
      },
      {
        "h": "14. Consecuencias de una infracción",
        "p": [
          "Hacemos cumplir esta Política de forma proporcional a la gravedad de la infracción, pero nos reservamos el derecho de tomar la medida más severa ante cualquier infracción. Las consecuencias pueden incluir, solas o en combinación: rechazar o bloquear silenciosamente una solicitud; eliminar o poner en cuarentena el contenido generado; emitir una advertencia; restringir funciones; suspender la cuenta en espera de investigación; y terminar permanentemente la cuenta y eliminar el modelo y los datos asociados.",
          "Para las categorías de tolerancia cero y claramente ilegales de las Secciones 5, 6 y 9 —en particular cualquier contenido de aparente CSAM, no consentido o relacionado con la trata— la respuesta es la terminación inmediata y permanente, la preservación de pruebas y el reporte a las autoridades, sin advertencia y sin derecho alguno a la reincorporación.",
          "La terminación por una infracción no te da derecho a reembolso ni limita ningún otro recurso disponible para nosotros. Podemos negarnos a hacer negocios con, y vetar permanentemente a, cualquier persona que hayamos terminado por una infracción grave, incluso en cuentas futuras. Cuando una infracción nos cause una pérdida (por ejemplo, contracargos, multas de las redes de tarjetas o costos legales), sigues siendo responsable de ella en la medida permitida por la ley."
        ]
      },
      {
        "h": "15. Reporte a las autoridades (NCMEC y fuerzas del orden)",
        "p": [
          "Estamos legalmente obligados, y comprometidos, a reportar el aparente material de abuso sexual infantil al National Center for Missing & Exploited Children (NCMEC) a través de la CyberTipline, y a preservar el contenido y los registros asociados conforme a 18 U.S.C. § 2258A. Reportaremos y cooperaremos sin importar dónde se hayan originado la persona usuaria o el contenido.",
          "También podemos reportar otros presuntos delitos —incluidos imágenes íntimas no consentidas, trata, sextorsión y amenazas de violencia— a las autoridades competentes, y podemos responder a requerimientos legales válidos como citaciones (subpoenas), órdenes judiciales (warrants) y solicitudes de preservación.",
          "Cuando realizamos un reporte obligatorio o a las fuerzas del orden, podemos preservar y divulgar datos relevantes de la cuenta, de verificación, de prompts, de cargas, de resultados y de registros. Por lo general no avisaremos a una persona usuaria que es objeto de dicho reporte cuando hacerlo esté prohibido por ley o pueda comprometer una investigación o la seguridad infantil."
        ]
      },
      {
        "h": "16. Retiro de NCII, la Ley TAKE IT DOWN y la DMCA",
        "p": [
          "Operamos un proceso de retiro acelerado para imágenes íntimas no consentidas (NCII). En consonancia con la Ley TAKE IT DOWN, si eres una persona identificable representada en contenido visual íntimo publicado o alojado por el Servicio sin tu consentimiento (incluida una falsificación digital de ti), puedes solicitar su retiro, y retiraremos el contenido reportado, y haremos esfuerzos razonables por retirar copias idénticas, dentro de las 48 horas siguientes a una solicitud válida. Envía las solicitudes de retiro de NCII a «[POR DEFINIR: correo o formulario web de recepción de NCII/retiros]».",
          "Dado que nuestro modelo exige tu propio consentimiento verificado antes de clonar cualquier imagen, no debería existir contenido de imagen no consentida en el Servicio; este proceso existe como salvaguarda y para reportes relativos a contenido que alojamos o generamos.",
          "Respondemos a las notificaciones de presunta infracción de derechos de autor conforme a la Digital Millennium Copyright Act (DMCA) de EE. UU. Si crees que un contenido del Servicio infringe tus derechos de autor, envía una notificación conforme a nuestro agente designado: «[POR DEFINIR: nombre del agente designado DMCA, domicilio postal, correo electrónico y número de registro ante la Oficina de Derechos de Autor de EE. UU.]». Retiraremos o inhabilitaremos el acceso al material infractor y terminaremos a las personas infractoras reincidentes. Los procedimientos de contranotificación están disponibles según lo previsto por la ley.",
          "Estos canales de retiro son adicionales al, y no reemplazan al, canal de reporte de la Sección 17."
        ]
      },
      {
        "h": "17. Cómo reportar contenido prohibido o una infracción",
        "p": [
          "Si tienes conocimiento de contenido o conducta que infrinja esta Política —incluido contenido que te represente a ti o a otra persona real sin consentimiento, sospecha de explotación de una persona menor, suplantación, o cualquier categoría prohibida anterior— repórtalo de inmediato a soporte@letshoot.ai, o a través del control de reporte dentro del portal cuando esté disponible.",
          "Para ayudarnos a actuar con rapidez, incluye (en la medida de lo posible, y sin enviar tú mismo material ilegal): una descripción del contenido o de la conducta, cualquier URL, nombre de cuenta o identificador de contenido, por qué crees que infringe esta Política, y cómo podemos contactarte. Si una persona menor está en peligro inmediato, contacta primero a los servicios de emergencia locales.",
          "Revisamos los reportes con prontitud, priorizamos los reportes de seguridad infantil y de contenido no consentido por encima de todos los demás, y tomamos medidas conforme a las Secciones 14 a 16 según corresponda. Buscamos acusar recibo de los reportes rápidamente y resolverlos dentro del plazo exigido por nuestros socios de pago y la ley aplicable. Prohibimos las represalias contra cualquier persona que realice un reporte de buena fe."
        ]
      },
      {
        "h": "18. Datos biométricos, conservación y tus derechos",
        "p": [
          "Para verificar tu identidad y entrenar tu modelo, tratamos identificadores biométricos e información biométrica derivada de tu rostro y tu cuerpo (\"datos biométricos\"), que son datos personales sensibles conforme a leyes como la Illinois Biometric Information Privacy Act (BIPA) y datos de categoría especial conforme al artículo 9 del RGPD. Los recopilamos y usamos únicamente con tu consentimiento explícito por escrito, solo para operar el Servicio para ti, y no los vendemos.",
          "Conservamos las imágenes de entrenamiento, el modelo entrenado y los registros de verificación solo durante el tiempo necesario para prestar el Servicio y cumplir nuestras obligaciones legales y de conservación de registros (incluidos los requisitos del § 2257 y de las redes de tarjetas), y destruimos los datos biométricos conforme al calendario de retención establecido en nuestra Política de Privacidad y Datos Biométricos, o antes ante una solicitud de eliminación válida, sujeto a retenciones legales.",
          "Según dónde residas, puedes tener derechos de acceso, rectificación, supresión o restricción del tratamiento de tus datos personales, a retirar el consentimiento y a presentar una reclamación ante una autoridad de control (por ejemplo, los derechos del RGPD/RGPD del Reino Unido, y los derechos de la CCPA/CPRA). Ejerce estos derechos, y consulta el detalle completo, a través de nuestra Política de Privacidad y Datos Biométricos. Nuestro representante en la UE conforme al artículo 27 del RGPD es «[POR DEFINIR: nombre y domicilio del representante del art. 27 en la UE]» y nuestro representante en el Reino Unido es «[POR DEFINIR: nombre y domicilio del representante del RGPD del Reino Unido]»."
        ]
      },
      {
        "h": "19. Cambios, términos aplicables y contacto",
        "p": [
          "Podemos actualizar esta Política de tiempo en tiempo, incluso para reflejar cambios en la ley, en las reglas de las redes de tarjetas o de los procesadores de pago, en la tecnología de detección, o en el Servicio. Los cambios sustanciales se publicarán con una nueva fecha de \"última actualización\", y el uso continuado del Servicio tras una actualización constituye la aceptación de la Política revisada. Los cambios exigidos por motivos legales o de cumplimiento de pagos pueden entrar en vigor de inmediato.",
          "Esta Política forma parte de, y se rige por los mismos términos que, nuestros Términos de servicio, incluidas sus disposiciones de ley aplicable y resolución de disputas. Ley aplicable y jurisdicción: «[POR DEFINIR: estado de ley aplicable y jurisdicción competente]».",
          "Las preguntas sobre esta Política, y los reportes de contenido prohibido, pueden dirigirse a ASM Media Group LLC en soporte@letshoot.ai. Las solicitudes de inspección de registros, DMCA, NCII y de derechos sobre datos deben usar los contactos específicos identificados en las Secciones 4, 16 y 18. Este documento es un borrador interno preparado para su revisión por el abogado del operador y no constituye asesoría legal para ninguna persona usuaria final."
        ]
      }
    ]
  },
  "en": {
    "title": "Acceptable Use & Prohibited Content Policy",
    "s": [
      {
        "h": "1. Purpose, scope and relationship to our other policies",
        "p": [
          "This Acceptable Use & Prohibited Content Policy (the \"Policy\") governs all use of letshoot.ai and the LetShoot platform, portal, tools and APIs (collectively, the \"Service\"), operated by ASM Media Group LLC (\"LetShoot\", \"we\", \"us\"). It applies to every account holder, creator, agency, team member, and anyone who uploads material to, generates content through, or otherwise accesses the Service (\"you\").",
          "The Service exists for a single, narrow purpose: verified adult (18+) content creators upload photographs of themselves so that we can train a per-creator artificial-intelligence likeness model (a LoRA or \"digital clone\") of that same consenting creator, and generate new adult images and video of the creator's own verified likeness, which the creator may then sell on third-party adult platforms. Any use outside that purpose is prohibited.",
          "This Policy is incorporated into and forms part of our Terms of Service, and must be read together with our Privacy & Biometric Data Policy, our 18 U.S.C. § 2257 Compliance Statement, and our Consent & Content-Generation Policy. Where this Policy is stricter than another document, the stricter rule controls. Capitalized terms not defined here have the meaning given in the Terms of Service.",
          "This Policy is enforced against the same standard everywhere we operate, regardless of the location of the creator or the viewer. In some jurisdictions our rules are stricter than local law; that is intentional. Nothing here is legal advice to you."
        ]
      },
      {
        "h": "2. The core rule — only your own verified likeness",
        "p": [
          "You may create, train and generate content using one likeness only: your own. Before any model is trained we verify your identity and age using a government-issued photo ID and a liveness/verification selfie, and we bind your account to that verified identity. Every training image you upload must depict you, the same verified person, and no one else as a subject.",
          "You may not upload, request, train on, or generate content that depicts any other real, identifiable person — whether a celebrity, an ex-partner, a friend, a co-worker, a stranger, another creator, a composite \"face-swap\", or a fictional-seeming likeness that is in fact based on a real person. Requesting a clone of anyone other than yourself is a serious violation and, depending on the content, may also be a crime.",
          "Group, duet or \"scene-partner\" content is permitted only where every human likeness that appears is either (a) your own verified likeness, or (b) a separately verified, consenting adult creator who has an active LetShoot account and has signed a scene-specific consent for that exact collaboration, documented through the Service. Fully synthetic non-real \"partners\" are subject to the same age, non-minor and thematic rules in Sections 5–9. You are responsible for ensuring no real third party is recognizably reproduced in the background, on screens, in reflections, or in any incidental element of a generated image.",
          "Adding text, watermarks, captions or metadata that misattribute the content to another person, or that suggest a real third party participated when they did not, is prohibited."
        ]
      },
      {
        "h": "3. Consent to create is not consent to publish",
        "p": [
          "We treat the creation of content and the publication of content as two separate acts, each requiring its own basis. Your signed onboarding consent authorizes us to build and operate your digital clone and to generate content for you. It does not, by itself, authorize the public distribution of any particular image or video.",
          "You are solely responsible for where, whether and how you publish or sell the content we deliver to you, and for complying with the terms, age rules, labeling rules and prohibited-content rules of every third-party platform on which you publish. Content that is acceptable to generate for private review may still be unacceptable to publish on a given platform.",
          "You may withdraw or narrow your consent at any time as described in our Consent & Content-Generation Policy and Privacy & Biometric Data Policy. Withdrawal stops future generation and triggers deletion of your training data and model on the timelines stated in those policies, but cannot retroactively recall content you have already downloaded, published or sold."
        ]
      },
      {
        "h": "4. Pre-publication review and our role as producer",
        "p": [
          "Because we generate the content, LetShoot (ASM Media Group LLC) acts as the producer of record for the images and video created through the Service and maintains age-verification and consent records for the verified individual depicted, as described in our 18 U.S.C. § 2257 Compliance Statement. Records custodian and inspection address: «[TO BE SET: Custodian of Records legal name and U.S. street address]».",
          "Every generation request is subject to review before content is finalized and released to you for download. Review combines automated filtering (including prompt screening, nudity/age classifiers, and hash-matching against known-illegal-content databases) with human moderation of flagged items. We may hold, refuse, edit-block, or delete any request or output that violates this Policy, and we may do so before, during or after generation.",
          "Passing review is not an endorsement, legal clearance, or guarantee that content complies with the rules of any third-party platform, or with the law of any particular jurisdiction. Review is a safety and compliance control operated for LetShoot's purposes; the ultimate responsibility for lawful, in-policy requests remains yours.",
          "We may re-review previously generated content at any time, including retroactively when detection tools, card-network rules, or legal obligations change."
        ]
      },
      {
        "h": "5. Zero-tolerance content — minors, age-regression and minor-appearing depictions (CSAM)",
        "p": [
          "We have absolute zero tolerance for any content that sexualizes, or appears to sexualize, a minor. This is the single most important rule on the platform and it admits no exception, artistic claim, role-play framing, or \"it's only AI\" defense.",
          "The following are strictly and permanently prohibited: (a) any sexual or nude content depicting a real person under 18; (b) any AI-generated, drawn, rendered, morphed or \"virtual\" content that depicts, or is designed to appear to depict, a minor in a sexual or nude context, including fully synthetic characters; (c) age-regression or \"age-down\" generations that make your own verified adult likeness appear to be a minor; (d) content styled to suggest a minor — for example childlike bodies, school or nursery settings, toys, pacifiers, braces, or \"barely legal\"/\"teen\" framing that depicts or implies a person under 18; and (e) any prompt, caption, tag, or metadata that solicits, describes or markets any of the foregoing.",
          "Under U.S. law such material is child sexual abuse material (CSAM), and depending on content and jurisdiction may also constitute obscene visual representations of the sexual abuse of children. We do not require that a request \"succeed\" to act: attempting to generate this content is itself a terminating violation.",
          "When we detect apparent CSAM or attempts to produce it, we will: immediately block and preserve the material and associated account data as required by 18 U.S.C. § 2258A and applicable law; report to the National Center for Missing & Exploited Children (NCMEC) through the CyberTipline; permanently terminate the account and the person's access; and cooperate with law enforcement, including preserving evidence for the statutory retention period. We do not provide advance notice of a report, and we do not \"warn and allow\" for this category."
        ]
      },
      {
        "h": "6. Non-consensual and image-based sexual abuse content",
        "p": [
          "All content on the Service must depict only the fully informed, freely given consent of the verified person(s) whose likeness appears. Content that depicts, sexualizes, or is designed to appear to depict non-consent is prohibited, and content that reproduces a real person without their consent is prohibited.",
          "Prohibited non-consensual content includes, without limitation: (a) any depiction of rape, sexual assault, \"forced\" sex, or coercion presented as real or as the theme of the scene; (b) content depicting a person who is asleep, unconscious, drugged, heavily intoxicated, hypnotized, or otherwise incapacitated and therefore unable to consent; (c) \"revenge porn\", leaked, hacked, hidden-camera, upskirt, voyeur, or otherwise surreptitiously obtained material; (d) sextortion or any content produced under threat, blackmail or duress; and (e) any deepfake, face-swap, or likeness-based content that reproduces a real, identifiable person who has not personally verified and consented through the Service (see Section 2).",
          "You may not upload another person's private images to be cloned, morphed, \"nudified\", or inserted into generated content, even if you claim to have their permission — the only permission we accept is that person's own verified, documented consent given directly to LetShoot.",
          "Consensual depictions of fantasy dynamics between verified adults may be permissible only where they are clearly consensual within the scene and are not otherwise prohibited by Sections 5, 8 or 9 or by our payment partners' rules; where a theme is ambiguous, we will treat it as prohibited."
        ]
      },
      {
        "h": "7. Third-party likeness, impersonation and unauthorized persons",
        "p": [
          "You may not impersonate any person or entity, or generate content that falsely suggests a real person's participation, endorsement, or authorship. This includes generating content \"in the style of\", \"as\", or resembling a named celebrity, public figure, influencer, or private individual.",
          "You may not upload reference images, prompts, or textual descriptions intended to steer a generation toward the likeness, distinctive features, tattoos, or identifying marks of any real person other than yourself (or a co-verified scene partner under Section 2).",
          "You are responsible for third parties who appear incidentally in your uploaded photographs (for example, people visible in a mirror, a window, a photo-within-a-photo, or the background). Remove or fully obscure them before upload; we may reject uploads that contain unverified faces.",
          "Trademarks, logos, uniforms (including those implying law-enforcement, military, or medical authority in a deceptive way), and other brand or institutional identifiers may not be used in a manner that infringes rights or misleads viewers."
        ]
      },
      {
        "h": "8. Prohibited themes and acts",
        "p": [
          "The following themes and depictions are prohibited on the Service, both as generated output and as the subject of prompts, tags, titles or marketing, because they are illegal in relevant jurisdictions, prohibited by our card networks and payment processors, or both. This list is illustrative, not exhaustive; we may prohibit additional categories to remain compliant with applicable law and our payment partners.",
          "(a) Incest and familial content — any depiction, description or theme of sexual activity between blood relatives, including \"pseudo-incest\" or step-family framing presented as a family relationship. (b) Bestiality / zoophilia — any sexual content involving animals or animal-like creatures. (c) Necrophilia and \"snuff\" — any sexualization of death, corpses, or content depicting or simulating a person being killed. (d) Minor-adjacent or age-play content of any kind (see Section 5, which controls absolutely).",
          "(e) Non-consent themes as described in Section 6, including drugged, unconscious, hypnosis, and \"forced\" scenarios. (f) Extreme violence, torture, mutilation, dismemberment, serious or permanent bodily injury, cannibalism, or content whose primary purpose is to depict pain or gore. (g) Weapons used to threaten, coerce, or inflict non-consensual harm in a sexual context. (h) Breath-play, strangulation, or asphyxiation depicted as non-consensual or life-endangering.",
          "(i) Scat/coprophilia, and other bodily-waste content to the extent restricted by our payment processors. (j) Content depicting or promoting self-harm, suicide, or eating disorders in a sexualized context. (k) Any hate-based sexual content that dehumanizes a person or group on the basis of a protected characteristic. Because payment-processor rules vary and are updated frequently, certain fetish categories (for example, some watersports, heavy BDSM, or fluid content) may be conditionally restricted; the current governing list is «[TO BE SET: current payment processor(s) and the version/date of their published prohibited-content list]»."
        ]
      },
      {
        "h": "9. Prohibited illegal, exploitative and harmful content",
        "p": [
          "You may not use the Service to create, request, promote, or facilitate any content that is illegal, or that depicts, advertises, or solicits illegal conduct. This includes, without limitation: human trafficking, sexual exploitation, or any content connected to trafficking or coercion; prostitution, escort solicitation, or the sale of in-person sexual services; the sale, use, or promotion of illegal drugs; and any activity that violates applicable obscenity, exploitation, or sexual-conduct laws.",
          "You may not use the Service to harass, threaten, stalk, dox, defame, or endanger any person, or to produce content intended to intimidate or extort.",
          "You may not use generated content for fraud, catfishing, romance scams, fake dating or fan profiles, synthetic identity creation, or to deceive any person about who they are interacting with.",
          "You may not upload malware, attempt to access accounts or data that are not yours, scrape or reverse-engineer the models or the Service, circumvent moderation or safety controls, resell or sublicense access to the Service without a written agreement, or use the Service to build, train, or benchmark a competing likeness model."
        ]
      },
      {
        "h": "10. Payment-network and processor compliance (Visa, Mastercard, Segpay)",
        "p": [
          "The Service and the content generated through it must at all times comply with the rules of the card networks and payment processors we use to accept payment, including Visa (including its Global Brand Protection Program and standards for merchants facilitating adult content), Mastercard (including its Specialty Merchant Registration Program requirements for adult content), and our adult-billing payment processor(s), which may include Segpay, CCBill, Epoch, or another authorized processor.",
          "In furtherance of those rules, and consistent with the rest of this Policy: (a) every person depicted is age- and identity-verified and has documented, revocable consent; (b) all content is reviewed before it is released; (c) illegal content — above all CSAM and non-consensual content — is absolutely prohibited, blocked, and reported; (d) we maintain a monitored complaint and takedown process (Sections 16–17); and (e) we keep the records the networks and processors require, and we cooperate with their audits and requests.",
          "If a card network or payment processor updates its prohibited-content standards, those updated standards apply to you automatically upon our adoption of them, and may narrow what is permitted under this Policy without further notice. Complaints subject to processor rules will be acknowledged and resolved within «[TO BE SET: complaint acknowledgment/resolution timeframe required by current processor(s), e.g., 7 business days]».",
          "Content the card networks require to be prohibited will be prohibited on the Service even if it would otherwise be lawful in a given jurisdiction."
        ]
      },
      {
        "h": "11. AI-provenance, labeling and disclosure",
        "p": [
          "All content produced through the Service is synthetic media created by artificial intelligence from your verified likeness. You may not represent generated content as an unaltered photograph or as documentary of an event that did not occur where doing so would deceive viewers, defraud them, or violate the disclosure rules of a platform or applicable law.",
          "We may embed and preserve provenance signals in delivered content — for example, content credentials/metadata (such as C2PA-style manifests), invisible or visible watermarks, or model tags — to support authenticity and abuse detection. You may not strip, alter, or falsify these provenance signals, and you must not misrepresent third-party content as having been produced by LetShoot.",
          "Where a third-party platform, advertising rule, or law (including emerging AI-transparency and synthetic-media disclosure requirements) requires that AI-generated or AI-altered sexual content be labeled as such, you are responsible for applying that label when you publish. We recommend clear \"AI-generated\" disclosure as a default best practice."
        ]
      },
      {
        "h": "12. Prohibited platform conduct and technical misuse",
        "p": [
          "Beyond content, the following conduct is prohibited: creating more than one account to evade verification, suspension, or limits; sharing, selling, or transferring your account or your trained model to another person; submitting false verification documents or another person's identity documents; and using automated means to overload, probe, or disrupt the Service.",
          "You may not attempt to jailbreak, prompt-inject, or otherwise manipulate our moderation, safety, or age-classification systems, or to coax the models into producing content prohibited by Sections 5–9. Attempts to do so are themselves violations, independent of whether they succeed.",
          "You may not use the Service in a way that infringes intellectual-property rights, misappropriates another's name, image or likeness (NIL) or right of publicity, or breaches any contract or platform term to which you are subject."
        ]
      },
      {
        "h": "13. Detection and moderation",
        "p": [
          "We use a combination of automated and human systems to enforce this Policy, including prompt and caption screening, image classifiers for nudity and apparent age, and hash-matching of uploaded and generated media against industry databases of known illegal content. Flagged material is routed to trained human reviewers.",
          "We may log prompts, uploads, outputs, and account activity as needed to operate these controls, investigate suspected violations, meet record-keeping obligations, and respond to lawful requests. Handling of this data — including biometric data — is described in our Privacy & Biometric Data Policy.",
          "Automated detection is imperfect and may over- or under-flag; human review, account action, and mandatory reporting are layered on top precisely because no single control is sufficient for this content category."
        ]
      },
      {
        "h": "14. Consequences of a violation",
        "p": [
          "We enforce this Policy proportionately to the severity of the violation, but we reserve the right to take the most serious action for any violation. Consequences may include, alone or in combination: refusing or silently blocking a request; removing or quarantining generated content; issuing a warning; restricting features; suspending the account pending investigation; and permanently terminating the account and deleting the associated model and data.",
          "For the zero-tolerance and clearly illegal categories in Sections 5, 6 and 9 — in particular any apparent CSAM, non-consensual, or trafficking-related content — the response is immediate and permanent termination, preservation of evidence, and reporting to authorities, without warning and without any right to reinstatement.",
          "Termination for a violation does not entitle you to a refund, and does not limit any other remedy available to us. We may decline to do business with, and may permanently ban, any person we have terminated for a serious violation, including across future accounts. Where a violation causes us loss (for example chargebacks, fines from card networks, or legal costs), you remain responsible for it to the extent permitted by law."
        ]
      },
      {
        "h": "15. Reporting to authorities (NCMEC and law enforcement)",
        "p": [
          "We are legally required, and we are committed, to report apparent child sexual abuse material to the National Center for Missing & Exploited Children (NCMEC) via the CyberTipline, and to preserve the associated content and records as required by 18 U.S.C. § 2258A. We will report and cooperate regardless of where the user or the content originated.",
          "We may also report other suspected crimes — including non-consensual intimate imagery, trafficking, sextortion, and threats of violence — to appropriate law-enforcement authorities, and we may respond to valid legal process such as subpoenas, warrants, and preservation requests.",
          "When we make a mandatory or law-enforcement report, we may preserve and disclose relevant account, verification, prompt, upload, output, and log data. We generally will not tip off a user that they are the subject of such a report where doing so is prohibited by law or would compromise an investigation or child-safety."
        ]
      },
      {
        "h": "16. NCII removal, the TAKE IT DOWN Act, and DMCA",
        "p": [
          "We operate an expedited removal process for non-consensual intimate imagery (NCII). Consistent with the TAKE IT DOWN Act, if you are an identifiable individual depicted in intimate visual content published or hosted by the Service without your consent (including a digital forgery of you), you may request removal, and we will remove the reported content, and make reasonable efforts to remove identical copies, within 48 hours of a valid request. Send NCII removal requests to «[TO BE SET: NCII/removal intake email or web form]».",
          "Because our model requires your own verified consent before any likeness is cloned, non-consensual likeness content should never exist on the Service; this process exists as a backstop and for reports concerning content we host or generate.",
          "We respond to notices of alleged copyright infringement under the U.S. Digital Millennium Copyright Act (DMCA). If you believe content on the Service infringes your copyright, send a compliant notice to our designated agent: «[TO BE SET: DMCA designated agent name, mailing address, email, and U.S. Copyright Office registration number]». We will remove or disable access to infringing material and terminate repeat infringers. Counter-notice procedures are available as provided by law.",
          "These removal channels are in addition to, and do not replace, the reporting channel in Section 17."
        ]
      },
      {
        "h": "17. How to report prohibited content or a violation",
        "p": [
          "If you become aware of content or conduct that violates this Policy — including content depicting you or another real person without consent, suspected exploitation of a minor, impersonation, or any prohibited category above — report it to us immediately at soporte@letshoot.ai, or through the in-portal report control where available.",
          "To help us act quickly, please include (where you can, and without sending illegal material yourself): a description of the content or conduct, any URL, account name, or content identifier, why you believe it violates this Policy, and how we can contact you. If a minor is in immediate danger, contact local emergency services first.",
          "We review reports promptly, prioritize child-safety and non-consensual-content reports above all others, and take action under Sections 14–16 as appropriate. We aim to acknowledge reports quickly and to resolve them within the timeframe required by our payment partners and applicable law. We prohibit retaliation against anyone who makes a good-faith report."
        ]
      },
      {
        "h": "18. Biometric data, retention and your rights",
        "p": [
          "To verify your identity and train your model, we process biometric identifiers and biometric information derived from your face and body (\"biometric data\"), which is sensitive personal data under laws such as the Illinois Biometric Information Privacy Act (BIPA) and special-category data under GDPR Article 9. We collect and use it only with your explicit written consent, only to operate the Service for you, and we do not sell it.",
          "We retain training images, the trained model, and verification records only for as long as needed to provide the Service and to meet our legal and record-keeping obligations (including § 2257 and card-network requirements), and we destroy biometric data on the retention schedule set out in our Privacy & Biometric Data Policy, or sooner upon a valid deletion request, subject to legal holds.",
          "Depending on where you live, you may have rights to access, correct, delete, or restrict the processing of your personal data, to withdraw consent, and to lodge a complaint with a regulator (for example, GDPR/UK GDPR rights, and CCPA/CPRA rights). Exercise these rights, and see full detail, through our Privacy & Biometric Data Policy. Our EU representative under GDPR Article 27 is «[TO BE SET: EU Article 27 representative name and address]» and our UK representative is «[TO BE SET: UK GDPR representative name and address]»."
        ]
      },
      {
        "h": "19. Changes, governing terms and contact",
        "p": [
          "We may update this Policy from time to time, including to reflect changes in law, card-network or payment-processor rules, detection technology, or the Service. Material changes will be posted with a new \"last updated\" date, and continued use of the Service after an update constitutes acceptance of the revised Policy. Changes required for legal or payment-compliance reasons may take effect immediately.",
          "This Policy is part of, and is governed by the same terms as, our Terms of Service, including their governing-law and dispute-resolution provisions. Governing law and venue: «[TO BE SET: governing-law state and venue]».",
          "Questions about this Policy, and reports of prohibited content, may be directed to ASM Media Group LLC at soporte@letshoot.ai. Records-inspection, DMCA, NCII, and data-rights requests should use the specific contacts identified in Sections 4, 16 and 18. This document is an internal draft prepared for review by the operator's attorney and is not legal advice to any end user."
        ]
      }
    ]
  }
};

export default function AcceptableUsePage() {
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
