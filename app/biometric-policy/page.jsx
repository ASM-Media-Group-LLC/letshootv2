'use client';

// Auto-assembled legal page. DRAFT — must be reviewed by an attorney before publishing.
// Bilingual ES/EN via useLegalLang(). Placeholders marked [POR DEFINIR / TO BE SET].
import LegalPage, { Section, useLegalLang } from '@/components/LegalPage';

const C = {
  "es": {
    "title": "Política de Consentimiento, Conservación y Destrucción de Datos Biométricos",
    "s": [
      {
        "h": "1. Introducción, Finalidad y Ámbito de Aplicación",
        "p": [
          "1.1. Esta Política de Consentimiento, Conservación y Destrucción de Datos Biométricos (la \"Política\") explica cómo LetShoot, un servicio operado por ASM Media Group LLC (\"LetShoot\", \"nosotros\" o \"nuestro\"), recopila, utiliza, almacena, protege, divulga, conserva y destruye de forma permanente los identificadores biométricos y la información biométrica de los creadores de contenido para adultos que utilizan nuestra plataforma (cada uno, un \"Creador\", \"usted\" o \"su\").",
          "1.2. LetShoot es un servicio mediante el cual un Creador adulto, verificado y que otorga su consentimiento, sube fotografías de sí mismo para que podamos entrenar y operar un modelo de identidad basado en inteligencia artificial, individual para cada Creador (un \"Modelo\" o \"clon digital\") de ese mismo Creador. El Creador utiliza después ese Modelo para generar nuevas imágenes y videos de su propia identidad verificada. La plataforma está diseñada para que un Creador solo pueda clonar su propia identidad; clonar a cualquier otra persona está estrictamente prohibido. Esta Política rige la dimensión biométrica de todo ese proceso.",
          "1.3. Esta Política se redacta para cumplir con la Ley de Privacidad de Información Biométrica de Illinois, 740 ILCS 14/1 y siguientes (\"BIPA\"); la Ley de Captura o Uso de Identificadores Biométricos de Texas, Tex. Bus. & Com. Code sección 503.001 (\"CUBI\"); la ley biométrica de Washington, RCW 19.375 y siguientes; el Artículo 9 y disposiciones conexas del Reglamento General de Protección de Datos de la UE y del RGPD del Reino Unido (conjuntamente, \"RGPD\"), que regulan los datos biométricos como categoría especial; y la Ley de Privacidad del Consumidor de California, en su versión modificada por la Ley de Derechos de Privacidad de California (\"CCPA/CPRA\"), que clasifica la información biométrica como información personal sensible. Cuando estas leyes difieran, aplicaremos el estándar más protector para el Creador.",
          "1.4. Esta Política se aplica a todos los identificadores biométricos e información biométrica que obtenemos de los Creadores a través de nuestro sitio web letshoot.ai, nuestro portal de Creadores, nuestras API y cualquier servicio relacionado (conjuntamente, los \"Servicios\"). Complementa, y debe leerse junto con, nuestra Política de Privacidad general, los Términos de Servicio y el Consentimiento y Licencia de Contenido del Creador. Los términos en mayúscula no definidos aquí tienen el significado establecido en dichos documentos.",
          "1.5. Esta Política es un documento interno de gobernanza que también sirve como la política escrita disponible públicamente exigida por la sección 15(a) de BIPA. Refleja nuestro calendario de conservación establecido y las pautas para destruir de forma permanente los datos biométricos."
        ]
      },
      {
        "h": "2. Definiciones",
        "p": [
          "2.1. \"Identificador biométrico\" significa un escaneo de retina o iris, huella dactilar, huella de voz o escaneo de la geometría de la mano o del rostro, así como cualquier término equivalente conforme a la ley aplicable. Para LetShoot, los identificadores biométricos que manejamos principalmente son los escaneos de la geometría facial y, cuando el Creador aporta voz o video, huellas de voz y geometría de movimiento facial derivadas del propio cuerpo del Creador.",
          "2.2. \"Geometría facial\" significa las características geométricas únicas y medibles del rostro de un Creador -- incluidas las distancias relativas, proporciones, contornos y relaciones espaciales entre los puntos de referencia faciales -- tal como se extraen, miden o representan en forma numérica a partir de las fotografías o el video del Creador, con el fin de identificar o reconstruir computacionalmente a esa persona.",
          "2.3. \"Información biométrica\" significa cualquier información, con independencia de cómo se capture, convierta, almacene o comparta, que se base en un identificador biométrico del Creador y se utilice para identificar a esa persona. Esto incluye expresamente las representaciones matemáticas derivadas de los identificadores biométricos del Creador.",
          "2.4. \"Modelo\", \"clon digital\", \"pesos del modelo\" y \"embeddings\" significan, respectivamente, el modelo de identidad basado en IA entrenado e individual para cada Creador, los parámetros numéricos (pesos) producidos al entrenar ese modelo con las fotografías del Creador, y las representaciones vectoriales (embeddings) que codifican la identidad facial y corporal del Creador. Conforme a la Sección 4, LetShoot los trata como información biométrica sujeta a esta Política.",
          "2.5. \"Autorización por escrito\" significa el consentimiento informado, específico, libre y revocable, otorgado por escrito por el Creador, que autoriza la recopilación, el almacenamiento y el uso de sus identificadores biométricos e información biométrica, según lo exige la sección 15(b) de BIPA y las leyes análogas.",
          "2.6. \"Encargado del tratamiento\" y \"subencargado\" significan un tercero que trata datos biométricos siguiendo nuestras instrucciones documentadas y por cuenta nuestra, bajo un contrato escrito que impone obligaciones de confidencialidad y protección de datos al menos tan protectoras como esta Política.",
          "2.7. \"Destrucción permanente\" significa la eliminación o des-identificación irreversible de los datos biométricos, de modo que ya no puedan recuperarse, reconstruirse ni volver a asociarse con el Creador, tanto en los sistemas de producción como en las copias de seguridad, según se describe en la Sección 12."
        ]
      },
      {
        "h": "3. Datos Biométricos que Recopilamos y Cómo lo Hacemos",
        "p": [
          "3.1. Recopilamos datos biométricos únicamente del Creador al que pertenecen, y solo después de que el Creador haya otorgado una autorización por escrito válida. No recopilamos datos biométricos de ningún tercero, y a los Creadores se les prohíbe contractual y técnicamente enviar la identidad de otra persona.",
          "3.2. El material de origen es el conjunto de fotografías y, en su caso, videos cortos o muestras de voz, que el Creador sube de sí mismo. A partir de ese material de origen extraemos o derivamos: (a) escaneos de la geometría facial del Creador; (b) cuando se aporta video o audio, huellas de voz y geometría de movimiento facial; y (c) los embeddings numéricos y los pesos del modelo entrenado que codifican la identidad del Creador (véase la Sección 4).",
          "3.3. Recopilamos datos biométricos a través de los Servicios en relación con dos operaciones distintas: primero, para construir (entrenar) el Modelo del Creador; y segundo, para operar (ejecutar la inferencia de) ese Modelo, de modo que el Creador pueda generar nuevo contenido de su propia identidad. Ambas operaciones están comprendidas dentro de la limitación de finalidad descrita en la Sección 5.",
          "3.4. Dado que LetShoot es la entidad que fija la identidad del Creador en un Modelo entrenado y genera las representaciones visuales sexualmente explícitas resultantes, LetShoot actúa también como el \"productor\" y mantiene obligaciones de verificación de edad y conservación de registros conforme al 18 U.S.C. sección 2257; dichas obligaciones se abordan en nuestra documentación separada de conservación de registros 2257 y se referencian aquí porque el mismo material subido es a la vez material de origen 2257 y material de origen biométrico.",
          "3.5. No utilizamos los datos biométricos del Creador para identificarlo en otros servicios, para construir ninguna base de datos de reconocimiento facial de uso general, ni para ninguna finalidad distinta de las indicadas en la Sección 5."
        ]
      },
      {
        "h": "4. El Modelo Entrenado, los Pesos y los Embeddings También Son Datos Biométricos",
        "p": [
          "4.1. LetShoot trata expresamente el Modelo entrenado individual de cada Creador -- incluidos sus pesos y cualquier embedding o representación vectorial derivada de las fotografías del Creador -- como información biométrica en el sentido de BIPA, CUBI y la ley de Washington, como dato biométrico de categoría especial conforme al RGPD, y como información personal sensible conforme a CCPA/CPRA.",
          "4.2. Adoptamos esta posición porque los pesos del Modelo y los embeddings son representaciones matemáticas derivadas directamente de, y vinculadas de forma única a, la geometría facial y la identidad corporal del Creador, y se utilizan para reconstruir e identificar computacionalmente a esa persona concreta. Un Modelo es, en esencia, una codificación numérica portátil de los identificadores biométricos del Creador.",
          "4.3. En consecuencia, todas las protecciones de esta Política -- consentimiento, limitación de finalidad, la prohibición de venta, arrendamiento, intercambio y lucro, los límites a la divulgación, las salvaguardas de seguridad y el calendario de conservación y destrucción -- se aplican no solo a las fotografías subidas en bruto y a los escaneos de geometría facial extraídos, sino igualmente al Modelo entrenado, sus pesos y sus embeddings.",
          "4.4. Cuando esta Política exige la destrucción de los datos biométricos de un Creador, ese requisito se extiende e incluye la destrucción permanente e irreversible del Modelo, los pesos y los embeddings del Creador, tanto en producción como en las copias de seguridad, según lo establecido en las Secciones 11 y 12."
        ]
      },
      {
        "h": "5. Limitación de Finalidad",
        "p": [
          "5.1. Recopilamos, almacenamos y utilizamos los identificadores biométricos y la información biométrica de un Creador con el único y exclusivo fin de construir y operar el propio Modelo de identidad de ese mismo Creador, bajo su dirección -- es decir, entrenar el Modelo, mantenerlo y protegerlo, y generar las imágenes y videos de la propia identidad verificada del Creador que este solicite.",
          "5.2. No utilizaremos los datos biométricos de un Creador para ninguna finalidad secundaria, incompatible o no relacionada. Sin carácter limitativo, no utilizamos datos biométricos para publicidad o marketing, para entrenar ningún modelo de IA compartido, fundacional, multi-creador o de uso general, para la vigilancia o identificación de ninguna persona, para investigación no relacionada con la operación del Modelo del Creador, ni para crear contenido de ninguna persona distinta del Creador que otorga su consentimiento.",
          "5.3. Los datos biométricos de un Creador nunca se utilizan para construir, ampliar, ajustar o influir en el Modelo de otro Creador, y los Modelos se mantienen aislados por Creador de forma lógica y, cuando es factible, física.",
          "5.4. Cualquier cambio material en estas finalidades requeriría una nueva autorización por escrito, independiente, del Creador, obtenida antes de que comience el nuevo uso, según se describe en la Sección 7."
        ]
      },
      {
        "h": "6. Bases Jurídicas del Tratamiento",
        "p": [
          "6.1. Conforme a BIPA, CUBI y la ley de Washington, nuestra base jurídica para recopilar, almacenar y utilizar datos biométricos es la autorización por escrito informada del Creador, obtenida antes de la recopilación, junto con la divulgación de la finalidad específica y del calendario de conservación/destrucción descrito en esta Política.",
          "6.2. Conforme al RGPD, los datos biométricos tratados para identificar de forma única a una persona son datos de categoría especial según el Artículo 9. Nuestra base lícita conforme al Artículo 9(2)(a) es el consentimiento explícito del Creador, otorgado para las finalidades especificadas en la Sección 5. Nuestra base conforme al Artículo 6 es la ejecución de nuestro contrato con el Creador (Artículo 6(1)(b)) y, en la medida aplicable, el consentimiento (Artículo 6(1)(a)). El Creador puede retirar su consentimiento en cualquier momento según se describe en la Sección 13; la retirada no afecta la licitud del tratamiento anterior a la misma.",
          "6.3. Conforme a CCPA/CPRA, la información biométrica es información personal sensible. La utilizamos solo para las finalidades descritas en la Sección 5, no la \"vendemos\" ni la \"compartimos\" según se definen esos términos en la CCPA/CPRA, y respetamos el derecho a limitar el uso de la información personal sensible de forma coherente con dichas finalidades.",
          "6.4. Dado que nuestro tratamiento implica datos de categoría especial a gran escala, mantenemos (o mantendremos) una evaluación de impacto relativa a la protección de datos y registros de las actividades de tratamiento, según exigen los Artículos 30 y 35 del RGPD."
        ]
      },
      {
        "h": "7. Consentimiento Informado por Escrito y Autorización",
        "p": [
          "7.1. Antes de recopilar cualquier identificador biométrico o información biométrica, se debe informar al Creador por escrito de que se están recopilando y almacenando datos biométricos; de la finalidad específica de la recopilación y el uso; y del plazo durante el cual se recopilarán, almacenarán y utilizarán los datos, así como de los criterios para su destrucción. A continuación, el Creador debe firmar una autorización por escrito que autorice dicha recopilación, almacenamiento y uso.",
          "7.2. El consentimiento se obtiene mediante un acto claro, independiente y afirmativo (por ejemplo, una pantalla de consentimiento específica y una firma o casilla que no esté agrupada con términos no relacionados). Conservamos un registro fechado y auditable de la autorización por escrito de cada Creador durante el plazo exigido por la ley.",
          "7.3. El consentimiento para crear un Modelo es distinto del consentimiento para publicar o distribuir cualquier contenido resultante. Esta Política rige el tratamiento biométrico (recopilación, entrenamiento, almacenamiento y generación); la publicación, distribución y licencia del contenido generado se rigen por separado en el Consentimiento y Licencia de Contenido del Creador. Un Creador puede permitir la creación del Modelo restringiendo o retirando los derechos de publicación, y viceversa, con sujeción a dichos documentos.",
          "7.4. El consentimiento es específico y granular. Cuando introduzcamos una finalidad de tratamiento biométrico materialmente nueva, una nueva modalidad (por ejemplo, añadir clonación de voz cuando solo se habían autorizado imágenes) o una nueva categoría de identificador biométrico, obtendremos una nueva autorización por escrito antes de que comience dicho tratamiento.",
          "7.5. El Creador debe tener al menos 18 años y completar la verificación de identidad y edad antes de que se recopile cualquier dato biométrico. No recopilamos a sabiendas datos biométricos de menores bajo ninguna circunstancia (véase la Sección 16)."
        ]
      },
      {
        "h": "8. Prohibición de Venta, Arrendamiento, Intercambio o Lucro con Identificadores Biométricos (Sección 15(c) de BIPA)",
        "p": [
          "8.1. De conformidad con la sección 15(c) de BIPA, LetShoot no vende, arrienda, intercambia ni obtiene lucro de otro modo, ni lo hará, con los identificadores biométricos o la información biométrica de un Creador.",
          "8.2. Esta prohibición se aplica a las fotografías en bruto y a los escaneos de geometría facial derivados, e igualmente al Modelo entrenado, sus pesos y sus embeddings, todos los cuales tratamos como información biométrica conforme a la Sección 4. No monetizamos, licenciamos a terceros ni explotamos comercialmente de ningún otro modo los datos biométricos en sí.",
          "8.3. Para evitar dudas, LetShoot cobra a los Creadores tarifas de suscripción y de uso por el Servicio de construir y operar el propio Modelo del Creador, y los Creadores pueden obtener ingresos vendiendo el contenido generado en plataformas para adultos de terceros. Dichas tarifas y esos ingresos del Creador son la contraprestación por un servicio y por el propio contenido del Creador -- no constituyen, ni deben estructurarse como, la venta, arrendamiento, intercambio o lucro con los identificadores biométricos en sí. No transferimos, licenciamos ni cedemos los datos biométricos de ningún Creador a ninguna parte como transacción comercial.",
          "8.4. No incluimos identificadores biométricos ni información biométrica entre los activos ofrecidos, transferidos o valorados en ninguna financiación, venta del negocio, fusión o transacción similar como fuente de lucro derivada de los datos biométricos; cualquier transferencia permitida del negocio está sujeta a la Sección 9.4 y no autoriza monetizar datos biométricos en infracción de esta Sección 8."
        ]
      },
      {
        "h": "9. Divulgación Limitada de Datos Biométricos (Sección 15(d) de BIPA)",
        "p": [
          "9.1. No divulgamos, redivulgamos ni difundimos de otro modo los identificadores biométricos o la información biométrica de un Creador a ninguna persona o entidad, salvo en los casos permitidos por la sección 15(d) de BIPA y la ley análoga, a saber: (a) cuando el Creador (el titular de los datos biométricos) consiente la divulgación; (b) cuando la divulgación completa una transacción financiera solicitada o autorizada por el Creador; (c) cuando la divulgación es exigida por una ley estatal o federal o una ordenanza municipal; o (d) cuando la divulgación es exigida en virtud de una orden judicial o citación válida emitida por un tribunal competente.",
          "9.2. Fuera de esas cuatro condiciones, no compartimos datos biométricos. En particular, no divulgamos datos biométricos a anunciantes, intermediarios de datos ni proveedores de análisis, y no los publicamos.",
          "9.3. Utilizamos un conjunto limitado de encargados y subencargados verificados para alojar y operar los Servicios (véase la Sección 15). Cuando dicho encargado maneja datos biométricos estrictamente según nuestras instrucciones documentadas, únicamente para proporcionar infraestructura para el propio Modelo del Creador, y bajo un contrato escrito que impone confidencialidad y las protecciones de esta Política, ese arreglo se trata como un tratamiento por cuenta nuestra y no como una divulgación para las propias finalidades del encargado. A dichos encargados se les prohíbe vender, arrendar, intercambiar, lucrar con, o utilizar de forma independiente los datos biométricos.",
          "9.4. En caso de fusión, adquisición, reorganización o venta de activos, cualquier entidad sucesora deberá, como condición de la transferencia, aceptar por escrito quedar vinculada por esta Política y por la autorización por escrito existente de cada Creador, incluida la prohibición de la Sección 8 y las obligaciones de destrucción de las Secciones 11 y 12. Una transferencia que cambiara materialmente las finalidades del tratamiento requiere un nuevo consentimiento conforme a la Sección 7.4.",
          "9.5. Si se nos obliga a divulgar datos biométricos conforme a la Sección 9.1(c) o 9.1(d), y cuando esté legalmente permitido, notificaremos al Creador afectado y divulgaremos únicamente el mínimo de datos exigido."
        ]
      },
      {
        "h": "10. Almacenamiento, Seguridad y Confidencialidad",
        "p": [
          "10.1. Almacenamos, transmitimos y protegemos los identificadores biométricos y la información biométrica utilizando el estándar razonable de diligencia aplicable a nuestro sector, y de una manera igual o más protectora que la manera en que almacenamos, transmitimos y protegemos otra información confidencial y sensible, según exige la sección 15(e) de BIPA.",
          "10.2. Los datos biométricos se cifran en tránsito y en reposo. El acceso se restringe al personal autorizado y a los encargados según un estricto criterio de necesidad de conocer, con sujeción a autenticación, registro de actividad y controles de acceso basados en roles. Los datos de producción y las copias de seguridad se alojan en infraestructura ubicada en los Estados Unidos (Supabase y Vercel).",
          "10.3. Los datos biométricos, el Modelo, los pesos y los embeddings de cada Creador están aislados lógicamente y se asocian únicamente con la cuenta verificada de ese Creador, de modo que no puedan ser accedidos ni mezclados con los datos de otro Creador.",
          "10.4. Mantenemos salvaguardas administrativas, técnicas y físicas diseñadas para impedir el acceso, uso, divulgación, alteración o destrucción no autorizados de los datos biométricos, y revisamos periódicamente estas salvaguardas. En caso de una violación de seguridad que afecte a datos biométricos, notificaremos a los Creadores afectados y a las autoridades reguladoras según lo exija la ley aplicable."
        ]
      },
      {
        "h": "11. Calendario de Conservación",
        "p": [
          "11.1. Conservamos los identificadores biométricos y la información biométrica de un Creador -- incluidas las fotografías subidas en bruto utilizadas como material de entrenamiento, los escaneos de geometría facial extraídos y el Modelo entrenado, los pesos y los embeddings -- únicamente durante el tiempo necesario para cumplir las finalidades de la Sección 5, y nunca más allá de los límites de conservación establecidos a continuación.",
          "11.2. Salvo que se aplique un plazo más corto conforme a la Sección 11.3, destruiremos de forma permanente los datos biométricos de un Creador en la primera de las siguientes fechas en que ocurra (el \"Evento de Destrucción\"): (a) la fecha en que se haya satisfecho la finalidad inicial para la que se recopilaron u obtuvieron los datos biométricos; (b) la fecha en que el Creador retire su consentimiento al tratamiento biométrico; (c) la fecha en que se cierre o cancele la cuenta del Creador; o (d) tres (3) años después de la última interacción del Creador con LetShoot.",
          "11.3. Creadores en Texas (CUBI). Para un Creador cuyos datos biométricos estén sujetos a la ley CUBI de Texas, destruiremos el identificador biométrico dentro de un plazo razonable y, en todo caso, a más tardar en el primer aniversario (un año) de la fecha en que expire la finalidad para la que se recopiló el identificador, y en cualquier caso no más tarde del calendario general de la Sección 11.2 si este fuera anterior.",
          "11.4. \"Última interacción\" significa la fecha más reciente en que el Creador inició sesión, generó contenido, subió material, contactó al soporte o utilizó activamente de otro modo los Servicios. La mera existencia pasiva de una cuenta no constituye una interacción.",
          "11.5. Ciertos registros limitados deben conservarse por separado y durante plazos más largos conforme a otras leyes -- por ejemplo, los documentos de verificación de edad y de conservación de registros 2257, y los registros de transacciones exigidos para el cumplimiento fiscal, contable o de las redes de tarjetas. Dichos registros se conservan conforme a sus calendarios legales aplicables y se mantienen segregados de, y no se utilizan como, identificadores biométricos o información biométrica para ninguna finalidad prohibida por esta Política. La conservación de un registro de identidad 2257 no autoriza la conservación ni el uso del Modelo, los pesos o los embeddings del Creador más allá del calendario de esta Sección 11.",
          "11.6. Al producirse un Evento de Destrucción, la destrucción se lleva a cabo con prontitud y de conformidad con el método y el estándar de la Sección 12, incluso desde las copias de seguridad dentro del ciclo de rotación de copias descrito en ella."
        ]
      },
      {
        "h": "12. Estándar y Método de Destrucción",
        "p": [
          "12.1. Cuando se produce un Evento de Destrucción, destruimos de forma permanente e irreversible los identificadores biométricos y la información biométrica del Creador -- incluidas las fotografías de entrenamiento en bruto, los escaneos de geometría facial, las huellas de voz y los datos de movimiento facial, y el Modelo entrenado, sus pesos y sus embeddings -- de modo que los datos ya no puedan recuperarse, reconstruirse ni volver a asociarse con el Creador.",
          "12.2. La destrucción se extiende a todas las copias en los sistemas de producción y a las copias conservadas en copias de seguridad, instantáneas de recuperación ante desastres, cachés y registros. Dado que las copias de seguridad operan en un ciclo rotativo, los datos biométricos se purgan de los sistemas activos de inmediato al producirse el Evento de Destrucción y se eliminan de los soportes de copia de seguridad a más tardar al completarse el siguiente ciclo completo de rotación de copias, que no excede de [POR DEFINIR: periodo máximo de conservación/rotación de copias de seguridad, p. ej. 30 o 90 días]. Durante cualquier intervalo previo a la eliminación de las copias de seguridad, los datos permanecen cifrados, con acceso restringido, y no se utilizan para ninguna finalidad.",
          "12.3. La destrucción es irreversible. No conservamos claves de re-identificación, correspondencias ni embeddings residuales que permitan reconstruir un Modelo destruido o volver a identificar al Creador. Cuando se retira de servicio hardware o soportes, estos se borran o destruyen de forma segura de conformidad con estándares reconocidos de saneamiento de datos.",
          "12.4. Mantenemos un registro interno y auditable que documenta la fecha y la naturaleza de cada evento de destrucción (sin conservar los propios datos biométricos destruidos), de modo que podamos demostrar el cumplimiento de esta Política y de la ley aplicable.",
          "12.5. A solicitud, y tras completar la destrucción, confirmaremos al Creador por escrito que sus datos biométricos han sido destruidos de forma permanente."
        ]
      },
      {
        "h": "13. Retirada del Consentimiento",
        "p": [
          "13.1. Un Creador puede retirar su consentimiento a la recopilación, el almacenamiento y el uso de sus datos biométricos en cualquier momento, por cualquier motivo, sin que la retirada en sí misma conlleve penalización.",
          "13.2. Para retirar el consentimiento, un Creador puede utilizar el control disponible a tal efecto en la configuración de la cuenta dentro del portal, o puede contactarnos en soporte@letshoot.ai. Podemos adoptar medidas razonables para verificar que la solicitud procede del Creador (el titular de los datos biométricos) antes de actuar.",
          "13.3. La retirada del consentimiento constituye un Evento de Destrucción conforme a la Sección 11.2(b). Tras una retirada verificada, cesaremos todo tratamiento biométrico ulterior y destruiremos de forma permanente los datos biométricos del Creador -- incluidos el Modelo, los pesos y los embeddings del Creador -- de conformidad con las Secciones 11 y 12.",
          "13.4. La retirada del consentimiento no afecta la licitud del tratamiento realizado antes de la retirada. Dado que el Modelo y sus resultados se derivan de los datos biométricos del Creador, la retirada pondrá fin a la capacidad del Creador de generar nuevo contenido a partir del Modelo. La retirada del consentimiento biométrico no revoca por sí sola las licencias que el Creador ya haya otorgado sobre contenido ya generado y publicado; las cuestiones de licencia de contenido se rigen por el Consentimiento y Licencia de Contenido del Creador, y pueden aplicarse derechos separados (incluidos los derechos de retirada) conforme a nuestros procedimientos de NCII/retirada y DMCA.",
          "13.5. Podemos estar obligados a conservar los registros limitados y segregados descritos en la Sección 11.5 (como los registros 2257 y de transacciones) tras la retirada; dichos registros se conservan únicamente conforme a sus calendarios legales aplicables y no se utilizan como datos biométricos."
        ]
      },
      {
        "h": "14. Sus Derechos Legales",
        "p": [
          "14.1. Según la jurisdicción del Creador, este puede tener derechos de acceso, rectificación, supresión o limitación del tratamiento de sus datos biométricos, a la portabilidad de datos, a oponerse al tratamiento y a retirar el consentimiento, entre otros.",
          "14.2. Derechos RGPD (UE/RU). Los Creadores en la UE/RU pueden ejercer los derechos de acceso (Art. 15), rectificación (Art. 16), supresión (Art. 17), limitación (Art. 18), portabilidad (Art. 20) y oposición (Art. 21), y pueden retirar el consentimiento explícito del Artículo 9(2)(a) en cualquier momento. Los Creadores también tienen derecho a presentar una reclamación ante una autoridad de control.",
          "14.3. Derechos CCPA/CPRA. Los Creadores de California pueden solicitar conocer, acceder, corregir y suprimir su información personal y personal sensible, y pueden limitar el uso de la información personal sensible. No vendemos ni compartimos información biométrica y no discriminamos a los Creadores por ejercer sus derechos.",
          "14.4. Para ejercer cualquier derecho, contáctenos utilizando los datos de la Sección 18. Verificaremos la solicitud y responderemos dentro de los plazos exigidos por la ley aplicable. Algunos derechos están sujetos a excepciones legales -- por ejemplo, los registros que debemos conservar conforme a la Sección 11.5.",
          "14.5. El ejercicio del derecho de supresión o eliminación de datos biométricos, al igual que la retirada del consentimiento, dará lugar a la destrucción permanente del Modelo, los pesos y los embeddings del Creador conforme a las Secciones 11 y 12."
        ]
      },
      {
        "h": "15. Encargados y Subencargados del Tratamiento",
        "p": [
          "15.1. Nos apoyamos en un número limitado de encargados de infraestructura para alojar y operar los Servicios, incluidos el proveedor de base de datos y almacenamiento en la nube Supabase y el proveedor de alojamiento de aplicaciones Vercel, y los procesadores de pago CCBill y Epoch para las transacciones financieras. Estos proveedores tratan datos en los Estados Unidos.",
          "15.2. Cada encargado que maneja datos biométricos lo hace únicamente según nuestras instrucciones documentadas, exclusivamente para proporcionar la infraestructura necesaria para construir y operar el propio Modelo del Creador, y bajo un acuerdo escrito de tratamiento de datos que impone confidencialidad y salvaguardas al menos tan protectoras como esta Política. A los encargados se les prohíbe contractualmente vender, arrendar, intercambiar, lucrar con, o utilizar de forma independiente los datos biométricos, de conformidad con las Secciones 8 y 9.",
          "15.3. Los procesadores de pago reciben la información de transacción y facturación necesaria para completar una transacción financiera autorizada por el Creador; no se les proporcionan identificadores biométricos, pesos del modelo ni embeddings.",
          "15.4. Realizamos una diligencia razonable sobre los encargados y les exigimos, a su vez, que vinculen a cualquier subencargado a obligaciones equivalentes. Una lista actualizada de los subencargados que manejan datos biométricos está disponible a solicitud en soporte@letshoot.ai.",
          "15.5. Cualquier transferencia internacional de datos biométricos de Creadores de la UE/RU se realiza bajo un mecanismo de transferencia adecuado del RGPD (por ejemplo, las Cláusulas Contractuales Tipo y, cuando corresponda, el Adenda de Transferencia Internacional de Datos del Reino Unido), junto con medidas complementarias según sea necesario."
        ]
      },
      {
        "h": "16. Edad y Elegibilidad",
        "p": [
          "16.1. Los Servicios están estrictamente limitados a adultos de 18 años o más. No recopilamos, almacenamos ni utilizamos a sabiendas datos biométricos de ninguna persona menor de 18 años, y prohibimos cualquier intento de crear un Modelo de un menor o de cualquier persona distinta del Creador adulto verificado.",
          "16.2. Antes de recopilar cualquier dato biométrico, el Creador debe completar la verificación de identidad y edad. LetShoot, actuando como productor conforme al 18 U.S.C. sección 2257, mantiene los registros de verificación de edad exigidos.",
          "16.3. Aplicamos una política de tolerancia cero frente al material de abuso sexual infantil (CSAM). Cualquier contenido o carga que parezca representar a un menor se bloquea, no se utiliza para entrenar ni operar ningún Modelo, se reporta al Centro Nacional para Menores Desaparecidos y Explotados (NCMEC) y a las autoridades competentes según lo exija la ley, y la cuenta asociada se cancela.",
          "16.4. Si tenemos conocimiento de que hemos recopilado inadvertidamente datos biométricos de una persona menor de 18 años, destruiremos esos datos de conformidad con la Sección 12 de inmediato al descubrirlo, con sujeción únicamente a cualquier obligación de preservación impuesta por las autoridades competentes."
        ]
      },
      {
        "h": "17. Modificaciones de esta Política",
        "p": [
          "17.1. Podemos actualizar esta Política de vez en cuando para reflejar cambios en la ley, la tecnología o nuestras prácticas. La versión vigente está siempre disponible en nuestro sitio web y en el portal de Creadores, con una fecha de entrada en vigor.",
          "17.2. Si un cambio amplía materialmente las finalidades para las que tratamos datos biométricos, introduce una nueva categoría de identificador biométrico o afecta materialmente de otro modo los derechos de los Creadores, notificaremos a los Creadores afectados y, cuando sea exigible, obtendremos una nueva autorización por escrito antes de que comience el nuevo tratamiento, de conformidad con la Sección 7.4.",
          "17.3. El uso continuado de los Servicios tras una actualización no material constituye el reconocimiento de la Política actualizada; no obstante, ninguna actualización reduce las protecciones aplicables a los datos biométricos ya recopilados sin el consentimiento exigido por la ley."
        ]
      },
      {
        "h": "18. Contacto, Representantes y Custodio de Registros",
        "p": [
          "18.1. Operador. Los Servicios son operados por ASM Media Group LLC, en [POR DEFINIR: dirección postal completa en EE. UU. del operador ASM Media Group LLC]. Consultas generales sobre privacidad y datos biométricos: soporte@letshoot.ai.",
          "18.2. Contacto de Privacidad / Protección de Datos. Las preguntas sobre esta Política, las solicitudes de retirada del consentimiento o las solicitudes de ejercicio de derechos legales pueden dirigirse a [POR DEFINIR: nombre/cargo del responsable de privacidad o Delegado de Protección de Datos] en soporte@letshoot.ai.",
          "18.3. Custodio de Registros (18 U.S.C. sección 2257). El custodio de registros a efectos de verificación de edad y conservación de registros es [POR DEFINIR: nombre del custodio de registros] en [POR DEFINIR: dirección postal en EE. UU. del custodio de registros].",
          "18.4. Representante en la UE (Art. 27 RGPD). Nuestro representante en la Unión Europea es [POR DEFINIR: nombre y dirección del representante del Artículo 27 en la UE].",
          "18.5. Representante en el RU (Art. 27 RGPD del RU). Nuestro representante en el Reino Unido es [POR DEFINIR: nombre y dirección del representante del Artículo 27 en el Reino Unido].",
          "18.6. Ley aplicable. Esta Política se rige por las leyes del Estado de [POR DEFINIR: estado de EE. UU. cuya ley rige], sin perjuicio de las protecciones imperativas al consumidor o de protección de datos disponibles para los Creadores conforme a las leyes de su propia jurisdicción (incluida BIPA para residentes de Illinois, CUBI para residentes de Texas y el RGPD para residentes de la UE/RU).",
          "18.7. Este documento es un borrador interno preparado para su revisión por el asesor legal del operador. No constituye asesoramiento legal para ningún usuario final, y debe ser revisado y finalizado por un abogado cualificado antes de su publicación."
        ]
      }
    ]
  },
  "en": {
    "title": "Biometric Data Consent, Retention & Destruction Policy",
    "s": [
      {
        "h": "1. Introduction, Purpose and Scope",
        "p": [
          "1.1. This Biometric Data Consent, Retention & Destruction Policy (this \"Policy\") explains how LetShoot, a service operated by ASM Media Group LLC (\"LetShoot,\" \"we,\" \"us,\" or \"our\"), collects, uses, stores, protects, discloses, retains, and permanently destroys the biometric identifiers and biometric information of the adult content creators who use our platform (each, a \"Creator,\" \"you,\" or \"your\").",
          "1.2. LetShoot is a service through which a verified, consenting adult Creator uploads photographs of themselves so that we may train and operate a per-Creator artificial-intelligence likeness model (a \"Model\" or \"digital clone\") of that same Creator. The Creator then uses that Model to generate new images and videos of the Creator's own verified likeness. The platform is engineered so that a Creator may only clone their own likeness; cloning any other person is strictly prohibited. This Policy governs the biometric dimension of that entire process.",
          "1.3. This Policy is written to comply with the Illinois Biometric Information Privacy Act, 740 ILCS 14/1 et seq. (\"BIPA\"); the Texas Capture or Use of Biometric Identifier Act, Tex. Bus. & Com. Code section 503.001 (\"CUBI\"); the Washington biometric statute, RCW 19.375 et seq.; Article 9 and related provisions of the EU General Data Protection Regulation and the UK GDPR (together, \"GDPR\") governing special-category (biometric) data; and the California Consumer Privacy Act as amended by the California Privacy Rights Act (\"CCPA/CPRA\"), which classifies biometric information as sensitive personal information. Where these laws differ, we apply the standard most protective of the Creator.",
          "1.4. This Policy applies to all biometric identifiers and biometric information we obtain from Creators through our website at letshoot.ai, our Creator portal, our APIs, and any related service (collectively, the \"Services\"). It supplements, and should be read together with, our general Privacy Policy, Terms of Service, and Creator Consent & Content License. Capitalized terms not defined here have the meaning given in those documents.",
          "1.5. This Policy is an internal governance document that also serves as the publicly available written policy required by BIPA section 15(a). It reflects our established retention schedule and guidelines for permanently destroying biometric data."
        ]
      },
      {
        "h": "2. Definitions",
        "p": [
          "2.1. \"Biometric identifier\" means a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry, and any equivalent term under applicable law. For LetShoot, the biometric identifiers we principally handle are scans of face geometry and, where a Creator submits voice or video, voiceprints and related facial-motion geometry derived from the Creator's own body.",
          "2.2. \"Face geometry\" means the unique, measurable geometric characteristics of a Creator's face -- including the relative distances, proportions, contours, and spatial relationships among facial landmarks -- as extracted, measured, or represented in numerical form from the Creator's photographs or video for the purpose of identifying or computationally reconstructing that individual.",
          "2.3. \"Biometric information\" means any information, regardless of how it is captured, converted, stored, or shared, that is based on a Creator's biometric identifier and used to identify that individual. This expressly includes derived mathematical representations of the Creator's biometric identifiers.",
          "2.4. \"Model,\" \"digital clone,\" \"model weights,\" and \"embeddings\" mean, respectively, the trained per-Creator artificial-intelligence likeness model, the numerical parameters (weights) produced by training that model on the Creator's photographs, and the vector representations (embeddings) that encode the Creator's facial and bodily likeness. As stated in Section 4, LetShoot treats these as biometric information subject to this Policy.",
          "2.5. \"Written release\" means informed, specific, freely given, and revocable written consent executed by the Creator authorizing the collection, storage, and use of the Creator's biometric identifiers and biometric information, as required by BIPA section 15(b) and analogous laws.",
          "2.6. \"Processor\" and \"subprocessor\" mean a third party that processes biometric data on our documented instructions and on our behalf, under a written contract imposing confidentiality and data-protection obligations at least as protective as this Policy.",
          "2.7. \"Permanent destruction\" means the irreversible deletion or de-identification of biometric data such that it can no longer be recovered, reconstructed, or re-associated with the Creator, in production systems and in backups, as described in Section 12."
        ]
      },
      {
        "h": "3. Biometric Data We Collect and How",
        "p": [
          "3.1. We collect biometric data only from the Creator to whom it belongs, and only after the Creator has provided a valid written release. We do not collect biometric data from any third party, and Creators are contractually and technically prohibited from submitting another person's likeness.",
          "3.2. The source material is the set of photographs, and where applicable short videos or voice samples, that the Creator uploads of themselves. From that source material we extract or derive: (a) scans of the Creator's face geometry; (b) where video or audio is supplied, voiceprints and facial-motion geometry; and (c) the numerical embeddings and trained model weights that encode the Creator's likeness (see Section 4).",
          "3.3. We collect biometric data through the Services in connection with two distinct operations: first, to build (train) the Creator's Model; and second, to operate (run inference on) that Model so the Creator can generate new content of their own likeness. Both operations are within the purpose limitation described in Section 5.",
          "3.4. Because LetShoot is the entity that fixes the Creator's likeness into a trained Model and generates the resulting sexually explicit visual depictions, LetShoot also acts as the \"producer\" and maintains age-verification and records-keeping obligations under 18 U.S.C. section 2257; those obligations are addressed in our separate 2257 recordkeeping documentation and are cross-referenced here because the same uploaded material is both 2257 source material and biometric source material.",
          "3.5. We do not use the Creator's biometric data to identify the Creator across other services, to build any general-purpose facial-recognition database, or for any purpose other than those stated in Section 5."
        ]
      },
      {
        "h": "4. The Trained Model, Weights and Embeddings Are Biometric Data",
        "p": [
          "4.1. LetShoot expressly treats the trained per-Creator Model -- including its model weights and any embeddings or vector representations derived from the Creator's photographs -- as biometric information within the meaning of BIPA, CUBI, the Washington statute, and special-category biometric data under the GDPR, and as sensitive personal information under CCPA/CPRA.",
          "4.2. We adopt this position because the Model weights and embeddings are mathematical representations derived directly from, and uniquely tied to, the Creator's face geometry and bodily likeness, and they are used to computationally reconstruct and identify that specific individual. A Model is, in substance, a portable numerical encoding of the Creator's biometric identifiers.",
          "4.3. Consequently, every protection in this Policy -- consent, purpose limitation, the prohibition on sale, lease, trade, and profit, the limits on disclosure, the security safeguards, and the retention and destruction schedule -- applies not only to the raw uploaded photographs and extracted face-geometry scans, but equally to the trained Model, its weights, and its embeddings.",
          "4.4. When this Policy requires destruction of a Creator's biometric data, that requirement extends to and includes the permanent, irreversible destruction of the Creator's Model, weights, and embeddings, in production and in backups, as set out in Sections 11 and 12."
        ]
      },
      {
        "h": "5. Purpose Limitation",
        "p": [
          "5.1. We collect, store, and use a Creator's biometric identifiers and biometric information for the sole and exclusive purpose of building and operating that same Creator's own likeness Model at the Creator's direction -- that is, to train the Model, to maintain and secure it, and to generate the images and videos of the Creator's own verified likeness that the Creator requests.",
          "5.2. We will not use a Creator's biometric data for any secondary, incompatible, or unrelated purpose. Without limitation, we do not use biometric data for advertising or marketing, for training any shared, foundational, multi-creator, or general-purpose AI model, for surveillance or identification of any person, for research unrelated to operating the Creator's Model, or to create content of any person other than the consenting Creator.",
          "5.3. One Creator's biometric data is never used to build, augment, fine-tune, or influence another Creator's Model, and Models are logically and, where feasible, physically isolated per Creator.",
          "5.4. Any material change to these purposes would require a new, separate written release from the Creator obtained before the new use begins, as described in Section 7."
        ]
      },
      {
        "h": "6. Legal Bases for Processing",
        "p": [
          "6.1. Under BIPA, CUBI, and the Washington statute, our legal basis for collecting, storing, and using biometric data is the Creator's informed written release obtained before collection, together with the disclosure of the specific purpose and the retention/destruction schedule described in this Policy.",
          "6.2. Under the GDPR, biometric data processed to uniquely identify a person is special-category data under Article 9. Our lawful basis under Article 9(2)(a) is the Creator's explicit consent, given for the specified purposes in Section 5. Our Article 6 basis is the performance of our contract with the Creator (Article 6(1)(b)) and, to the extent applicable, consent (Article 6(1)(a)). The Creator may withdraw consent at any time as described in Section 13; withdrawal does not affect the lawfulness of processing before withdrawal.",
          "6.3. Under CCPA/CPRA, biometric information is sensitive personal information. We use it only for the purposes described in Section 5, we do not \"sell\" or \"share\" it as those terms are defined by the CCPA/CPRA, and we honor the right to limit the use of sensitive personal information consistent with those purposes.",
          "6.4. Because our processing involves large-scale special-category data, we maintain (or will maintain) a data protection impact assessment and records of processing activities as required by GDPR Articles 30 and 35."
        ]
      },
      {
        "h": "7. Informed Written Consent and Release",
        "p": [
          "7.1. Before we collect any biometric identifier or biometric information, the Creator must be informed in writing that biometric data is being collected and stored; of the specific purpose for the collection and use; and of the length of term for which the data will be collected, stored, and used and the criteria for its destruction. The Creator must then execute a written release authorizing that collection, storage, and use.",
          "7.2. Consent is obtained through a clear, standalone, affirmative action (for example, a dedicated consent screen and signature or checkbox that is not bundled with unrelated terms). We retain a dated, auditable record of each Creator's written release for the duration required by law.",
          "7.3. Consent to create a Model is distinct from consent to publish or distribute any resulting content. This Policy governs the biometric processing (collection, training, storage, and generation); publication, distribution, and licensing of generated content are governed separately by the Creator Consent & Content License. A Creator may permit Model creation while restricting or withdrawing publication rights, and vice versa, subject to those documents.",
          "7.4. Consent is specific and granular. Where we introduce a materially new biometric processing purpose, a new modality (for example, adding voice cloning where only images were previously authorized), or a new category of biometric identifier, we will obtain a fresh written release before that processing begins.",
          "7.5. A Creator must be at least 18 years old and must complete identity and age verification before any biometric data is collected. We do not knowingly collect biometric data from minors under any circumstances (see Section 16)."
        ]
      },
      {
        "h": "8. No Sale, Lease, Trade, or Profit from Biometric Identifiers (BIPA Section 15(c))",
        "p": [
          "8.1. Consistent with BIPA section 15(c), LetShoot does not, and will not, sell, lease, trade, or otherwise profit from a Creator's biometric identifiers or biometric information.",
          "8.2. This prohibition applies to the raw photographs and derived face-geometry scans and equally to the trained Model, its weights, and its embeddings, all of which we treat as biometric information under Section 4. We do not monetize, license to third parties, or otherwise commercially exploit the biometric data itself.",
          "8.3. For the avoidance of doubt, LetShoot charges Creators subscription and usage fees for the Service of building and operating the Creator's own Model, and Creators may earn revenue by selling the generated content on third-party adult platforms. Those fees and that Creator revenue are compensation for a service and for the Creator's own content -- they are not, and must not be structured as, the sale, lease, trade, or profiting from the biometric identifiers themselves. We do not transfer, license, or convey any Creator's biometric data to any party as a commercial transaction.",
          "8.4. We do not include biometric identifiers or biometric information in the assets offered, transferred, or valued in any financing, sale of the business, merger, or similar transaction as a source of profit derived from the biometric data; any permitted transfer of the business is subject to Section 9.4 and does not authorize monetizing biometric data in violation of this Section 8."
        ]
      },
      {
        "h": "9. Limited Disclosure of Biometric Data (BIPA Section 15(d))",
        "p": [
          "9.1. We do not disclose, redisclose, or otherwise disseminate a Creator's biometric identifiers or biometric information to any person or entity except as permitted by BIPA section 15(d) and analogous law, namely: (a) when the Creator (the subject of the biometric data) consents to the disclosure; (b) when the disclosure completes a financial transaction requested or authorized by the Creator; (c) when the disclosure is required by state or federal law or municipal ordinance; or (d) when the disclosure is required pursuant to a valid warrant or subpoena issued by a court of competent jurisdiction.",
          "9.2. Outside those four conditions, we do not share biometric data. In particular, we do not disclose biometric data to advertisers, data brokers, or analytics providers, and we do not publish it.",
          "9.3. We use a limited set of vetted processors and subprocessors to host and operate the Services (see Section 15). Where such a processor handles biometric data strictly on our documented instructions, solely to provide infrastructure for the Creator's own Model, and under a written contract imposing confidentiality and the protections of this Policy, that arrangement is treated as processing on our behalf and not as a disclosure for the processor's own purposes. Such processors are prohibited from selling, leasing, trading, profiting from, or independently using the biometric data.",
          "9.4. In the event of a merger, acquisition, reorganization, or sale of assets, any successor entity must, as a condition of transfer, agree in writing to be bound by this Policy and by each Creator's existing written release, including the prohibition in Section 8 and the destruction obligations in Sections 11 and 12. A transfer that would materially change the purposes of processing requires fresh consent under Section 7.4.",
          "9.5. If we are compelled to disclose biometric data under Section 9.1(c) or 9.1(d), we will, where legally permitted, notify the affected Creator and disclose only the minimum data required."
        ]
      },
      {
        "h": "10. Storage, Security and Confidentiality",
        "p": [
          "10.1. We store, transmit, and protect biometric identifiers and biometric information using the reasonable standard of care applicable to our industry, and in a manner that is the same as or more protective than the manner in which we store, transmit, and protect other confidential and sensitive information, as required by BIPA section 15(e).",
          "10.2. Biometric data is encrypted in transit and at rest. Access is restricted to authorized personnel and processors on a strict need-to-know basis, subject to authentication, logging, and role-based access controls. Production data and backups are hosted on infrastructure located in the United States (Supabase and Vercel).",
          "10.3. Each Creator's biometric data, Model, weights, and embeddings are logically isolated and associated only with that Creator's verified account, so that they cannot be accessed by, or commingled with, another Creator's data.",
          "10.4. We maintain administrative, technical, and physical safeguards designed to prevent unauthorized access, use, disclosure, alteration, or destruction of biometric data, and we periodically review these safeguards. In the event of a breach affecting biometric data, we will notify affected Creators and regulators as required by applicable law."
        ]
      },
      {
        "h": "11. Retention Schedule",
        "p": [
          "11.1. We retain a Creator's biometric identifiers and biometric information -- including the raw uploaded photographs used as training source material, the extracted face-geometry scans, and the trained Model, weights, and embeddings -- only for as long as necessary to fulfill the purposes in Section 5, and no longer than the retention limits set out below.",
          "11.2. Except where a shorter period applies under Section 11.3, we will permanently destroy a Creator's biometric data at the earliest to occur of the following events (the \"Destruction Trigger\"): (a) the date on which the initial purpose for collecting or obtaining the biometric data has been satisfied; (b) the date on which the Creator withdraws consent to the biometric processing; (c) the date the Creator's account is closed or terminated; or (d) three (3) years after the Creator's last interaction with LetShoot.",
          "11.3. Texas Creators (CUBI). For a Creator whose biometric data is subject to the Texas CUBI statute, we will destroy the biometric identifier within a reasonable time, and in no event later than the first anniversary (one year) of the date on which the purpose for collecting the identifier expires, and in any case no later than the general schedule in Section 11.2 if that would be sooner.",
          "11.4. \"Last interaction\" means the most recent date on which the Creator logged in, generated content, uploaded material, contacted support, or otherwise actively used the Services. Passive existence of an account is not an interaction.",
          "11.5. Certain limited records must be retained separately and for longer periods under other laws -- for example, age-verification and 2257 recordkeeping documents, and transaction records required for tax, accounting, or card-network compliance. Those records are retained under their governing legal schedules and are kept segregated from, and are not used as, biometric identifiers or biometric information for any purpose prohibited by this Policy. Retention of a 2257 identity record does not authorize retention or use of the Creator's Model, weights, or embeddings beyond the schedule in this Section 11.",
          "11.6. Upon a Destruction Trigger, destruction is carried out promptly and in accordance with the method and standard in Section 12, including from backups within the backup rotation cycle described there."
        ]
      },
      {
        "h": "12. Destruction Standard and Method",
        "p": [
          "12.1. When a Destruction Trigger occurs, we permanently and irreversibly destroy the Creator's biometric identifiers and biometric information -- including the raw training photographs, the face-geometry scans, voiceprints and facial-motion data, and the trained Model, its weights, and its embeddings -- so that the data can no longer be recovered, reconstructed, or re-associated with the Creator.",
          "12.2. Destruction extends to all copies in production systems and to copies held in backups, disaster-recovery snapshots, caches, and logs. Because backups operate on a rolling cycle, biometric data is purged from active systems immediately upon the Destruction Trigger and is expunged from backup media no later than the completion of the next full backup rotation cycle, which does not exceed [TO BE SET: maximum backup retention/rotation period, e.g. 30 or 90 days]. During any interval before backup expungement, the data remains encrypted, access-restricted, and is not used for any purpose.",
          "12.3. Destruction is irreversible. We do not retain de-anonymized keys, mappings, or residual embeddings that would permit reconstruction of a destroyed Model or re-identification of the Creator. Where hardware or media is decommissioned, it is securely wiped or destroyed in accordance with recognized data-sanitization standards.",
          "12.4. We maintain an internal, auditable log recording the date and nature of each destruction event (without retaining the destroyed biometric data itself), so that we can demonstrate compliance with this Policy and applicable law.",
          "12.5. Upon request, and after completing destruction, we will confirm to the Creator in writing that the Creator's biometric data has been permanently destroyed."
        ]
      },
      {
        "h": "13. Withdrawing Your Consent",
        "p": [
          "13.1. A Creator may withdraw consent to the collection, storage, and use of their biometric data at any time, for any reason, without penalty to the withdrawal itself.",
          "13.2. To withdraw consent, a Creator may use the in-portal control provided for this purpose in account settings, or may contact us at soporte@letshoot.ai. We may take reasonable steps to verify that the request comes from the Creator (the subject of the biometric data) before acting.",
          "13.3. Withdrawal of consent is a Destruction Trigger under Section 11.2(b). Upon a verified withdrawal, we will cease all further biometric processing and will permanently destroy the Creator's biometric data -- including the Creator's Model, weights, and embeddings -- in accordance with Sections 11 and 12.",
          "13.4. Withdrawal of consent does not affect the lawfulness of processing carried out before the withdrawal. Because the Model and its outputs are derived from the Creator's biometric data, withdrawal will end the Creator's ability to generate new content from the Model. Withdrawal of biometric consent does not by itself retract licenses the Creator may have already granted for content already generated and published; content-license matters are governed by the Creator Consent & Content License, and separate rights (including takedown rights) may apply under our NCII/takedown and DMCA procedures.",
          "13.5. We may be required to retain the limited, segregated records described in Section 11.5 (such as 2257 and transaction records) after withdrawal; those records are retained solely under their governing legal schedules and are not used as biometric data."
        ]
      },
      {
        "h": "14. Your Statutory Rights",
        "p": [
          "14.1. Depending on the Creator's jurisdiction, the Creator may have rights to access, correct, delete, or restrict the processing of their biometric data, to data portability, to object to processing, and to withdraw consent, among others.",
          "14.2. GDPR (EU/UK) rights. Creators in the EU/UK may exercise the rights of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), portability (Art. 20), and objection (Art. 21), and may withdraw Article 9(2)(a) explicit consent at any time. Creators also have the right to lodge a complaint with a supervisory authority.",
          "14.3. CCPA/CPRA rights. California Creators may request to know, access, correct, and delete their personal and sensitive personal information, and may limit the use of sensitive personal information. We do not sell or share biometric information and do not discriminate against Creators for exercising their rights.",
          "14.4. To exercise any right, contact us using the details in Section 18. We will verify the request and respond within the timeframes required by applicable law. Some rights are subject to legal exceptions -- for example, records we must retain under Section 11.5.",
          "14.5. Exercising the right to erasure or deletion of biometric data will, like withdrawal of consent, result in permanent destruction of the Creator's Model, weights, and embeddings under Sections 11 and 12."
        ]
      },
      {
        "h": "15. Third-Party Processors and Subprocessors",
        "p": [
          "15.1. We rely on a limited number of infrastructure processors to host and operate the Services, including cloud database and storage provider Supabase and application-hosting provider Vercel, and payment processors CCBill and Epoch for financial transactions. These providers process data in the United States.",
          "15.2. Each processor that handles biometric data does so only on our documented instructions, solely to provide the infrastructure necessary to build and operate the Creator's own Model, and under a written data-processing agreement imposing confidentiality and safeguards at least as protective as this Policy. Processors are contractually prohibited from selling, leasing, trading, profiting from, or independently using biometric data, consistent with Sections 8 and 9.",
          "15.3. Payment processors receive transaction and billing information necessary to complete a Creator-authorized financial transaction; they are not provided with biometric identifiers, model weights, or embeddings.",
          "15.4. We conduct reasonable due diligence on processors and require them, in turn, to bind any subprocessors to equivalent obligations. A current list of subprocessors handling biometric data is available on request at soporte@letshoot.ai.",
          "15.5. Any international transfer of biometric data of EU/UK Creators is carried out under an appropriate GDPR transfer mechanism (for example, Standard Contractual Clauses and, where relevant, the UK International Data Transfer Addendum), together with supplementary measures as needed."
        ]
      },
      {
        "h": "16. Age and Eligibility",
        "p": [
          "16.1. The Services are strictly limited to adults aged 18 years or older. We do not knowingly collect, store, or use biometric data from any person under 18, and we prohibit any attempt to create a Model of a minor or of any person other than the verified adult Creator.",
          "16.2. Before any biometric data is collected, the Creator must complete identity and age verification. LetShoot, acting as the producer under 18 U.S.C. section 2257, maintains the required age-verification records.",
          "16.3. We enforce a zero-tolerance policy toward child sexual abuse material (CSAM). Any content or upload that appears to depict a minor is blocked, is not used to train or operate any Model, and is reported to the National Center for Missing & Exploited Children (NCMEC) and to law enforcement as required by law, and the associated account is terminated.",
          "16.4. If we learn that we have inadvertently collected biometric data from a person under 18, we will permanently destroy that data in accordance with Section 12 immediately upon discovery, subject only to any preservation obligation imposed by law enforcement."
        ]
      },
      {
        "h": "17. Changes to This Policy",
        "p": [
          "17.1. We may update this Policy from time to time to reflect changes in law, technology, or our practices. The current version is always available on our website and in the Creator portal, with an effective date.",
          "17.2. If a change materially expands the purposes for which we process biometric data, introduces a new category of biometric identifier, or otherwise materially affects Creators' rights, we will notify affected Creators and, where required, obtain a fresh written release before the new processing begins, consistent with Section 7.4.",
          "17.3. Continued use of the Services after a non-material update constitutes acknowledgment of the updated Policy; however, no update reduces the protections applicable to biometric data already collected without the consent required by law."
        ]
      },
      {
        "h": "18. Contact, Representatives and Custodian of Records",
        "p": [
          "18.1. Operator. The Services are operated by ASM Media Group LLC, at [TO BE SET: ASM Media Group LLC full US street address for the operator]. General privacy and biometric inquiries: soporte@letshoot.ai.",
          "18.2. Privacy / Data Protection contact. Questions about this Policy, requests to withdraw consent, or requests to exercise statutory rights may be directed to [TO BE SET: name/title of privacy officer or Data Protection Officer] at soporte@letshoot.ai.",
          "18.3. Custodian of Records (18 U.S.C. section 2257). The custodian of records for age-verification and recordkeeping purposes is [TO BE SET: custodian of records name] at [TO BE SET: custodian of records US street address].",
          "18.4. EU representative (GDPR Art. 27). Our representative in the European Union is [TO BE SET: EU Article 27 representative name and address].",
          "18.5. UK representative (UK GDPR Art. 27). Our representative in the United Kingdom is [TO BE SET: UK Article 27 representative name and address].",
          "18.6. Governing law. This Policy is governed by the laws of the State of [TO BE SET: governing-law US state], without prejudice to mandatory consumer or data-protection protections available to Creators under the laws of their own jurisdiction (including BIPA for Illinois residents, CUBI for Texas residents, and the GDPR for EU/UK residents).",
          "18.7. This document is an internal draft prepared for review by the operator's legal counsel. It is not legal advice to any end user, and it should be reviewed and finalized by a qualified attorney before publication."
        ]
      }
    ]
  }
};

export default function BiometricPolicyPage() {
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
