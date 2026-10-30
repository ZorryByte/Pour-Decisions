/* Colección local por persona. Descubrir recetas no implica consumirlas. */
window.Insignias = (function(){
  const ranks = {
    cobre: {name:'Cobre', difficulty:'Básica', level:1},
    plata: {name:'Plata', difficulty:'Intermedia', level:2},
    oro: {name:'Oro', difficulty:'Difícil', level:3}
  };
  // Contrato de integración: [{questionId: 1, optionIndex: 0}], solo la partida actual.
  const FOUR_OPTIONS = new Set([2,5,8,10,13,16,18,21,24,26,29,32,34,37,40,42]);
  function normalizeAnswers(raw){
    const answers = new Map(), conflicts = new Set();
    if (!Array.isArray(raw)) return answers;
    raw.forEach(a => {
      if (!a || !Number.isInteger(a.questionId) || a.questionId < 1 || a.questionId > 48
        || !Number.isInteger(a.optionIndex) || a.optionIndex < 0 || a.optionIndex >= (FOUR_OPTIONS.has(a.questionId) ? 4 : 2)) return;
      if (answers.has(a.questionId) && answers.get(a.questionId) !== a.optionIndex) conflicts.add(a.questionId);
      answers.set(a.questionId, a.optionIndex);
    });
    conflicts.forEach(id => answers.delete(id));
    return answers;
  }
  function picked(c, question, option){ return c.answers.get(question) === option; }
  // Plata: cada campo admite alternativas y selecciones adicionales.
  // Oro: los conjuntos completos de base, frutas y estilos deben coincidir.
  const questionDrinks = {
    'cuenta-smurf':{mode:'flexible',alcohol:['Vodka','Ginebra','Tequila'],styles:['Ácido','Refrescante','Espumoso'],strength:['Medio','Fuerte']},
    'teatro-presupuesto':{mode:'flexible',fruit:['Fresa','Coco','Menta'],styles:['Dulce','Cremoso','Refrescante'],strength:['Suave','Medio']},
    'npc-desbloqueado':{mode:'flexible',alcohol:['Ron','Vodka','Sin alcohol'],styles:['Dulce','Suave','Sedoso'],strength:['Suave','Medio']},
    'speedrun-adios':{mode:'flexible',alcohol:['Ginebra','Vodka','Sin alcohol'],fruit:['Limón','Naranja','Menta'],styles:['Ácido','Refrescante','Espumoso']},
    'servidor-equivocado':{mode:'flexible',alcohol:['Ron','Tequila','Sin alcohol'],fruit:['Piña','Mango','Maracuyá'],styles:['Dulce','Ácido','Granizado']},
    'borrar-todos':{mode:'flexible',alcohol:['Vodka','Tequila','Brandy'],styles:['Ácido','Dulce','Sedoso'],strength:['Medio','Fuerte']},
    multijugador:{mode:'flexible',alcohol:['Ron','Ginebra','Sin alcohol'],fruit:['Coco','Menta','Durazno'],styles:['Cremoso','Refrescante','Suave']},
    'talento-viaticos':{mode:'flexible',fruit:['Fresa','Naranja','Piña'],styles:['Dulce','Refrescante','Espumoso'],strength:['Suave','Medio']},
    'gastronomia-fe':{mode:'flexible',alcohol:['Brandy','Whisky','Sin alcohol'],styles:['Cremoso','Dulce','Sedoso'],strength:['Suave','Medio']},
    'equipaje-emocional':{mode:'flexible',alcohol:['Ron','Vodka','Sin alcohol'],fruit:['Mango','Maracuyá','Durazno'],styles:['Dulce','Refrescante','Granizado']},
    'like-peritaje':{mode:'flexible',alcohol:['Vodka','Ginebra','Sin alcohol'],styles:['Dulce','Ácido','Espumoso'],strength:['Suave','Medio']},
    'matchmaking-premade':{mode:'flexible',fruit:['Fresa','Coco','Menta'],styles:['Dulce','Cremoso','Refrescante'],strength:['Suave','Medio']},
    'nbhd-softcore':{mode:'flexible',alcohol:['Ginebra','Brandy','Sin alcohol'],fruit:['Fresa','Durazno','Naranja'],styles:['Dulce','Cremoso','Sedoso']},
    'kanye-heartless':{mode:'flexible',alcohol:['Whisky','Tequila','Vodka'],styles:['Ácido','Refrescante','Espumoso'],strength:['Medio','Fuerte']},
    'triangulo-geometria':{mode:'exact',alcohol:['Ginebra'],fruit:['Limón','Naranja'],styles:['Ácido','Refrescante'],strength:['Suave']},
    'cadena-custodia':{mode:'exact',alcohol:['Vodka'],fruit:['Sandía','Limón'],styles:['Refrescante'],strength:['Medio']},
    'soporte-fiesta':{mode:'exact',alcohol:['Sin alcohol'],fruit:['Piña','Menta','Limón'],styles:['Refrescante'],strength:['Suave']},
    'honestidad-escudo':{mode:'exact',alcohol:['Whisky'],fruit:['Naranja','Limón'],styles:['Ácido'],strength:['Medio']},
    'no-wwe':{mode:'exact',alcohol:['Sin alcohol'],fruit:['Naranja','Mango'],styles:['Refrescante'],strength:['Suave']},
    'lealtad-recibo':{mode:'exact',alcohol:['Ron'],fruit:['Limón','Menta'],styles:['Dulce','Refrescante'],strength:['Medio']},
    'temporada-cancelada':{mode:'exact',alcohol:['Tequila'],fruit:['Maracuyá','Limón'],styles:['Ácido'],strength:['Fuerte']},
    'archivo-historico':{mode:'exact',alcohol:['Brandy'],fruit:['Durazno','Naranja'],styles:['Dulce'],strength:['Medio']},
    'nbhd-daddy-issues':{mode:'exact',alcohol:['Vodka'],fruit:['Fresa','Coco'],styles:['Dulce','Cremoso'],strength:['Medio']},
    'kanye-runaway':{mode:'exact',alcohol:['Whisky'],fruit:['Naranja','Maracuyá'],styles:['Ácido'],strength:['Fuerte']},
    'eva-karaoke':{mode:'exact',alcohol:['Sin alcohol'],fruit:['Coco','Piña'],styles:['Cremoso'],strength:['Suave']}
  };
  function matchesQuestionDrink(c, rule){
    if (!rule) return true;
    const values = {alcohol:c.selectedAlcohol,fruit:c.selectedFruit,styles:c.selectedStyles,strength:c.selectedStrengths};
    return ['alcohol','fruit','styles','strength'].every(key => {
      if (!rule[key]) return true;
      if (key === 'fruit' && c.any) return false;
      if (rule.mode === 'exact') return values[key].length === rule[key].length && rule[key].every(v => values[key].includes(v));
      return rule[key].some(v => values[key].includes(v));
    });
  }
  function drinkReason(rule){
    if (!rule) return '';
    const labels={alcohol:'base',fruit:'frutas',styles:'sabores o texturas',strength:'fuerza'};
    const parts=Object.keys(labels).filter(k=>rule[k]).map(k=>labels[k]+': '+rule[k].join(rule.mode === 'exact' ? ' + ' : ' o '));
    return rule.mode === 'exact'
      ? ' Además, elegiste exactamente '+parts.join('; ')+', sin bases, frutas, estilos ni fuerzas adicionales.'
      : ' Además, elegiste al menos una opción de cada grupo: '+parts.join('; ')+'. Podés agregar otras opciones.';
  }
  const questionCatalog = [
    ['traicion-wifi','Judas en dúo','Te invitaron a hacer equipo y vos ya estabas viendo cómo venderlo. Treinta monedas no, pero por ganar una partida sí te movés.','Juegos y competitividad','cobre','Dijiste que sí harías equipo para luego traicionarlo.',[[1,0]]],
    ['var-sobremesa','El VAR de sobremesa','Ibas perdiendo y apareció tu vocación de abogado. Qué casualidad que el reglamento solo te preocupa cuando no vas ganando.','Juegos y competitividad','cobre','Elegiste sacar el manual cuando vas perdiendo.',[[2,0]]],
    ['gg-veneno','Mal perder, buen ping','Si ganás, es habilidad. Si perdés, fue suerte. Qué estable está tu conexión y qué inestable tu versión de los hechos.','Juegos y competitividad','cobre','Después de perder, elegiste decir «Tuviste suerte».',[[3,1]]],
    ['cuenta-smurf','Cuenta smurf, cara de santo','Te hacés el principiante y encima defendés al amigo sospechoso. Ese lobby no era casual: era una operación familiar.','League of Legends','plata','Dijiste que sí fingirías ser principiante y elegiste defender al amigo sospechoso de ser impostor.',[[4,0],[5,2]]],
    ['sus-confianza','Qué SUSpechoso','Todos vieron a tu amigo salir del conducto y vos diciendo que seguro tenía sus razones. El impostor no necesita coartada: te tiene a vos.','Juegos y competitividad','cobre','Elegiste defender a tu amigo cuando creés que es el impostor.',[[5,2]]],
    ['revancha-desinstalo','Una más y desinstalo','Es tardísimo, perdiste y todavía querés revancha. El sueño se negocia; tu ego, por lo visto, no.','Videojuegos','cobre','Elegiste pedir una revancha ahora, aunque ya sea tardísimo.',[[6,0]]],
    ['teatro-presupuesto','Mucho show, poca HBO','Te ofrecés para la mímica y si no sabés algo lo tapás con un chiste. Todavía no salió el piloto y ya querés renovar temporada.','Memes','plata','Dijiste que sí a la mímica y elegiste soltar un chiste cuando no sabés responder.',[[7,0],[8,3]]],
    ['fuentes-mayami','Fuente: Arial 12','No tenías pruebas, pero tampoco dudas. Lo dijiste tan convencido que alguien ya lo está repitiendo en otra mesa.','Memes','cobre','Elegiste inventarte una respuesta y decirla convencido.',[[8,0]]],
    ['voy-saliendo','Rápidos y mentirosos','Dijiste «ya voy» desde tu cama. Toretto mueve carros; vos movés la hora de llegada.','Fiesta','cobre','Admitiste haber dicho «ya voy» mientras seguías en casa.',[[9,0]]],
    ['npc-desbloqueado','NPC desbloqueado','Saludás a gente que no ubicás y esperás a que el crush te hable primero. Mucho diálogo secundario, cero avance en la misión principal.','Videojuegos','plata','Admitiste saludar sin recordar a quién y elegiste esperar a que te salude quien te pone nervioso.',[[12,0],[16,2]]],
    ['speedrun-adios','Speedrun del adiós','Llamada falsa y salida sin despedirte. Te faltó tirar una bomba de humo y desbloqueabas viaje rápido.','Fiesta','plata','Elegiste fingir una llamada para irte y dijiste que sí te irías sin despedirte.',[[10,0],[39,0]]],
    ['feat-no-pidieron','Karaoke, pero de Temu','Pedimos la original y llegó tu versión. La melodía se parece; la letra la estás importando de otro universo.','Música','cobre','Elegiste inventar la letra de una canción que no te sabés.',[[11,0]]],
    ['servidor-equivocado','Multiverso del despiste','Llegaste el día equivocado y querés armar algo igual. Doctor Strange abrió portales por menos; vos ni abriste la invitación.','Fiesta','plata','Elegiste armar otro plan al llegar el día equivocado y dijiste que sí irías a una fiesta sin conocer a nadie.',[[13,2],[17,0]]],
    ['borrar-todos','Capturame si podés','Borraste la captura y confiaste en el silencio del grupo. Qué fe tan bonita en gente que hace capturas de las capturas.','Memes','plata','Elegiste borrar la captura del chat equivocado y admitiste usar la peda para decir lo que pensabas.',[[14,0],[41,0]]],
    ['backstage-imaginario','Mi tío trabaja en Spotify','Antes tu tío trabajaba en Nintendo; ahora conocés al DJ. Cambia la industria, sigue sin aparecer ninguna prueba.','Música','cobre','Admitiste decir que conocías al DJ sin conocerlo.',[[15,0]]],
    ['multijugador','Los Sims: sin autonomía','Tus amigos eligen dónde vas y cómo te vestís. Te falta quedarte parado frente a un plato sucio para completar el personaje.','Videojuegos','plata','Elegiste ir sin preguntar el destino y dijiste que sí dejarías que tus amigos te vistieran.',[[18,0],[20,0]]],
    ['taco-lore','Más vale taco que mal acompañado','El taco llegó con salsa, no con asuntos pendientes. Por una vez elegiste bien con hambre.','Fiesta','cobre','Elegiste ir por tacos en lugar de quedarte en la fiesta.',[[19,0]]],
    ['talento-viaticos','La Voz: edición con hambre','Nadie giró la silla, pero ya te pagaron la cena. Hasta compartís el último taco: este artista todavía se debe a su público.','Música','plata','Aceptaste cantar por la cena y dijiste que sí compartirías el último taco.',[[21,0],[23,0]]],
    ['gastronomia-fe','MasterChef del autoengaño','La comida está mala, vos la defendés y encima pagás de más. Gordon Ramsay ya estaría gritándote y todavía intentarías recomendarle el lugar.','Memes','plata','Elegiste defender el restaurante malo y pagar la cuenta por igual aunque pediste menos.',[[22,1],[37,0]]],
    ['equipaje-emocional','Equipaje emocional de mano','Te vas de viaje mañana sin preguntar mucho y repetís una cita incómoda. Eso de viajar ligero nunca incluyó tus decisiones.','Ligue y despecho','plata','Aceptaste el viaje con una mochila sin más preguntas y dijiste que sí a otra oportunidad para una cita incómoda.',[[24,0],[31,0]]],
    ['like-peritaje','CSI: Instagram','Veinte historias, tres teorías y un «jajaja» que según vos significa algo. El FBI ya cerró el caso; vos seguís ampliando la foto.','Ligue y despecho','plata','Admitiste confundir amabilidad con coqueteo y elegiste buscar una historia para responderle.',[[28,0],[29,3]]],
    ['triangulo-geometria','Triángulo sin geometría','No le escribís al ex, te acercás a quien te gusta y se lo contás al amigo que también anda detrás. Un drama romántico con gente que sí habla: cancelado por falta de conflicto.','Ligue y despecho','oro','Dijiste que no escribirías al ex, elegiste acercarte a saludar al crush y contarle a tu amigo que te gusta la misma persona.',[[25,1],[26,0],[30,0]]],
    ['matchmaking-premade','Tinder en cooperativo','Querés conocer a alguien, pero que venga tu grupo por si hay que hacer extracción. El romance empieza cuando todos ponen «yo sí voy».','Videojuegos','plata','Dijiste que no irías a una fiesta de desconocidos y preferiste conocer una cita en una salida en grupo.',[[17,1],[32,2]]],
    ['cadena-custodia','Find My dignidad','El vaso puede perderse, el celular jamás. Entregaste hasta el micrófono antes de soltar el teléfono. Se nota qué objeto tiene seguro.','Caos de fiesta','oro','Admitiste perder tu vaso, elegiste salvar el celular al derramar la bebida y pasar el micrófono al quedarte sin voz.',[[33,0],[34,1],[35,0]]],
    ['soporte-fiesta','Soporte técnico de la fiesta','Encontrás los celulares, reponés lo que rompés y ayudás a recoger. Viniste de invitado y terminaste siendo el adulto de guardia.','Fiesta','oro','Admitiste buscar los celulares de todos, elegiste reponer lo que rompiste y empezar a ayudar al recoger.',[[36,0],[38,0],[40,0]]],
    ['honestidad-escudo','El señor de los límites','Decís lo que pensás, te hacés cargo y te alejás cuando ya te hartaron. Gandalf cuidaba un puente; vos, por fin, tu paz mental.','Sinceridad','oro','Admitiste usar la peda para decir verdades, elegiste hablar lo que dijiste a espaldas de alguien y alejarte al poner un límite.',[[41,0],[42,1],[43,1]]],
    ['no-wwe','Esto no era la WWE','Buscás los celulares de todos, pedís disculpas cuando te descubren y te apartás de una pelea para pedir ayuda. Demasiada gestión de crisis para una entrada que ni te cobraron.','Caos de fiesta','oro','Admitiste buscar celulares, elegiste disculparte al ser descubierto hablando de alguien y apartarte a pedir ayuda tras intentar separar una pelea.',[[36,0],[42,0],[44,0]]],
    ['lealtad-recibo','Lealtad con recibo','No traicionás al equipo, hablás la cuenta y contás la infidelidad a solas. Sos de los pocos que todavía entregan la amistad con términos claros.','Amistad','oro','Dijiste que no traicionarías al equipo, elegiste hablar cómo dividir la cuenta y contarle a solas a tu amigo que le son infiel.',[[1,1],[37,3],[45,0]]],
    ['temporada-cancelada','Netflix canceló al ex','No escribís, silenciás y te vas si te ponen el cuerno. Esta vez no hay segunda temporada por mucho que la pida el protagonista.','Ligue y despecho','oro','Dijiste que no escribirías al ex, elegiste silenciar las historias del crush y terminar la relación ante una infidelidad.',[[25,1],[29,2],[47,1]]],
    ['archivo-historico','Google Fotos no olvida','Vos querés pasar página; el grupo te manda «un día como hoy». Ni la nube tiene tanto espacio como tus amigos para guardar tus cagadas.','Memes','oro','Admitiste saludar sin recordar a quién, elegiste contar en el grupo que llegaste el día equivocado y temer que te recuerden el desastre de la fiesta.',[[12,0],[13,0],[48,1]]],
    ['nbhd-daddy-issues','Daddy Issues','Le escribirías al ex, te mirás todas sus historias y no contás a quién te gusta. La playlist está en privado; tus decisiones ya las escuchó todo el grupo.','The Neighbourhood','oro','Dijiste que sí escribirías al ex, elegiste ver todas las historias del crush y guardarte que te gusta la misma persona que a tu amigo.',[[25,0],[29,0],[30,1]]],
    ['nbhd-softcore','Vecinos con derechos','Te prestaron atención y ya querés compartir código postal. The Neighbourhood en los audífonos; vos, mudándote a una relación que nadie confirmó.','The Neighbourhood','plata','Elegiste ensayar el saludo y admitiste confundir amabilidad con coqueteo.',[[16,0],[28,0]]],
    ['kanye-runaway','Ye pasaste','Usaste la peda de excusa, te descubrieron hablando mierda y todavía te alcanzó para mandar a alguien a la mierda. Te dieron un vaso y lo convertiste en una rueda de prensa sin abogado.','Kanye West','oro','Admitiste usar la peda para decir lo que pensabas, elegiste cambiar de tema al ser descubierto hablando de alguien y mandar a la mierda a quien no deja de molestarte.',[[41,0],[42,2],[43,0]]],
    ['kanye-heartless','808s & Funadas','Tenías cero pruebas y demasiada confianza. Lo de echarle la culpa a la peda llegó después. Tu próximo lanzamiento debería ser un comunicado.','Kanye West','plata','Elegiste inventarte una respuesta con convicción y admitiste usar la peda de excusa para decir lo que pensabas.',[[8,0],[41,0]]],
    ['eva-karaoke','Subite al karaoke, Shinji','No hacés mímica, solo cantás si alguien te acompaña y después te escondés en los coros. Misato ya cambió tres veces de estrategia para que agarrés el micrófono.','Evangelion','oro','Dijiste que no a la mímica, elegiste cantar solo acompañado y quedarte haciendo coros al perder la voz.',[[7,1],[21,1],[35,1]]]
  ].map(b => ({id:b[0], name:b[1], text:b[2], category:b[3], rank:b[4], reason:b[5]+drinkReason(questionDrinks[b[0]]), questionRequirements:b[6], beverageRequirements:questionDrinks[b[0]], test:c => b[6].every(a => picked(c,a[0],a[1])) && matchesQuestionDrink(c,questionDrinks[b[0]])}));
  const catalog = [
    ['rico','Qué rico entra','Dulce, suave y peligrosamente fácil de querer. Tu tipo, pero servido con hielo.','Pícaras','cobre','Elegiste dulce y fuerza suave.', c => c.sweet && c.soft],
    ['chiquito','Chiquito pero resuelve','Llegó en el vaso más pequeño y se robó toda la atención. Hay gente que con más hace menos.','Pícaras','plata','Descubriste un shot o un cóctel corto.', c => /kamikaze|shot|b.?52|rusty nail|godfather/.test(c.drink)],
    ['lengua','Con la lengua primero','La sal del borde lleva técnica. Qué bueno que justo en esto sí tenías experiencia.','Pícaras','plata','Descubriste una Margarita o una Paloma.', c => /margarita|paloma/.test(c.drink)],
    ['duro','Está duro','Pediste algo fuerte para hacerte el interesante y ahora estás negociando con un cubito de hielo.','Pícaras','cobre','Elegiste fuerza fuerte.', c => c.strong],
    ['apego','No era sed, era apego','Llevás media hora abrazando el vaso y contando algo que “ya superaste”.','Despecho','cobre','Combinaste un plan de cena con un sabor dulce.', c => c.dinner && c.sweet],
    ['hielo','El hielo también se fue','Prometió acompañarte toda la noche. Duró quince minutos. Ya conocías esa historia.','Despecho','plata','Combinaste cena, algo refrescante y fuerza suave.', c => c.dinner && c.fresh && c.soft],
    ['ex','Mi ex tenía menos ingredientes','Mentiras, problemas y alguien que era “solo una amistad”. Este cóctel por lo menos trae receta.','Despecho','plata','Tu receta tiene al menos seis ingredientes.', c => c.ingredients >= 6],
    ['notas','Ese mensaje era para Notas','Escribiste “espero que estés bien” con la intensidad de quien espera arruinarle la noche.','Despecho','oro','Descubriste cuatro recetas distintas con planes de cena.', c => c.dinners >= 4],
    ['saludar','Yo solo venía a saludar','Ya conectaste el cargador, elegiste tu vaso y preguntaste qué van a desayunar.','Fiesta','cobre','Elegiste fiesta hasta tarde.', c => c.party],
    ['bluetooth','Dictadura del Bluetooth','Dijo “voy a poner una” y ahora exige que nadie toque su celular. La democracia duró dos canciones.','Fiesta','plata','Combinaste fiesta, sabor refrescante y fuerza media.', c => c.party && c.fresh && c.medium],
    ['produccion','Producción sin presupuesto','La fiesta tiene luces, playlist y un cóctel de autor. Los vasos son de cumpleaños de 2014.','Fiesta','plata','Elegiste fiesta, cualquier fruta y fuerza suave.', c => c.party && c.any && c.soft],
    ['lore','El lore de la noche','Desapareciste diez minutos y volviste con una historia que necesita mapa, testigos y segunda temporada.','Fiesta','oro','Descubriste cinco recetas distintas.', c => c.discoveries >= 5],
    ['limon','El limón era un evento canónico','Hay tres tipos de ron, seis bolsas de hielo y nadie compró limones. No se podía evitar; había que vivirlo.','Fiesta','plata','Elegiste al menos tres bases y frutas sin limón.', c => c.bases >= 3 && c.fruits > 0 && !c.lemon],
    ['pudo','Se hizo lo que se pudo','La foto de referencia era un bar de lujo. El resultado parece una poción con asuntos pendientes.','Memes','cobre','Elegiste aventura improvisada.', c => c.adventure],
    ['fuente','Fuente: me lo inventé','Cambiaste cuatro ingredientes y seguís diciendo que es la receta original. La confianza está intacta.','Memes','plata','Combinaste aventura, varias bases y cualquier fruta.', c => c.adventure && c.bases >= 2 && c.any],
    ['chamba','Mi primera chamba','La coctelera abrió en pleno movimiento. Ahora el techo tiene notas cítricas.','Memes','cobre','Descubriste tu primera receta.', c => c.discoveries >= 1],
    ['cine','Esto es cine','Quemó una cáscara de naranja, bajó la luz y esperó el aplauso. El trago todavía no lo ha probado nadie.','Memes','plata','Combinaste whisky, naranja y un plan de cena.', c => c.whisky && c.orange && c.dinner],
    ['67','Muy 6… o quizás un 7','Le pidieron que calificara el cóctel y empezó a mover las manos. Seguimos sin saber si le gustó.','Memes','oro','Descubriste seis recetas distintas.', c => c.discoveries >= 6],
    ['sanando','Esa no, que estoy sanando','Pidió canciones alegres y a los cinco minutos estaba cantándole a una persona que ni vino.','Música','plata','Combinaste fiesta, sabor ácido y fuerza suave.', c => c.party && c.sour && c.soft],
    ['contacto','Cero contacto, cien canciones','No le hablás desde hace meses, pero le acabás de dedicar una playlist entera frente a doce testigos.','Música','cobre','Combinaste fiesta y una bebida sin alcohol.', c => c.party && c.zero],
    ['videoclip','Se activó el videoclip','Sonó la intro y el pasillo se convirtió en escenario. El vaso está haciendo de micrófono y nadie se atreve a interrumpir.','Música','plata','Combinaste fiesta, frutas tropicales y sabor dulce.', c => c.party && c.tropical >= 2 && c.sweet],
    ['vieja','La vieja escuela eras vos','Pediste “una de las viejitas”, alguien dijo que esa canción era de su infancia y necesitaste sentarte.','Música','cobre','Elegiste whisky o brandy.', c => c.whisky || c.brandy],
    ['bond','Bond, pero de acá','Martini, mirada seria y vaso de plástico. La misión consiste en encontrar dónde dejaron las aceitunas.','Películas','plata','Descubriste un Martini seco o de vodka.', c => /martini seco|martini de vodka/.test(c.drink)],
    ['strange','Doctor Strange del minibar','Movió las manos, mezcló cinco cosas y abrió un portal. Al parecer, lleva directo al sabor de pasta dental.','Películas','oro','Combinaste tres bases, menta y un plan de aventura.', c => c.bases >= 3 && c.mint && c.adventure],
    ['rapidos','Rápidos y curiosos','Preparó el cóctel sin medir nada. Ahora todos quieren saber qué le puso y él también.','Películas','cobre','Elegiste aventura y cualquier fruta.', c => c.adventure && c.any],
    ['mojito','Mojito en mantenimiento','La hierbabuena está agotada, el limón está caro y el ron está presente. El equipo agradece tu comprensión.','Cócteles','cobre','Descubriste una receta de Mojito.', c => /mojito/.test(c.drink)],
    ['margarita','Margarita tiene estándares','Te exige tequila, limón y un borde bien hecho. Vos pensabas resolver con una rodajita y buena actitud.','Cócteles','plata','Descubriste una receta de Margarita.', c => /margarita/.test(c.drink)],
    ['negroni','Negroni: relación complicada','El primer sorbo fue una discusión. El segundo, una duda. Ahora lo defendés como si te pagara el alquiler.','Cócteles','plata','Descubriste el Negroni.', c => c.drink === 'negroni'],
    ['personaje','Desarrollo de personaje','Antes medías con “un chorrito”. Hoy usaste medidor y descubriste que el problema nunca fue la receta.','Descubrimientos','oro','Exploraste los cuatro estilos: dulce, ácido, cremoso y refrescante.', c => ['Dulce','Ácido','Cremoso','Refrescante'].every(s => c.styles.includes(s))],
    ['paciencia','El ingrediente era paciencia','Mediste, enfriaste y probaste antes de servir. Te quedó tan bien que ahora molesta admitir cómo hacías los anteriores.','Descubrimientos','oro','Descubriste ocho recetas distintas.', c => c.discoveries >= 8],
    ['supp','La culpa es del supp','Preparaste el cóctel, elegiste los ingredientes y lo serviste vos. Claramente falló el que te pasó el hielo.','League of Legends','plata','Combinaste varias bases, sabor ácido y un plan de fiesta.', c => c.bases >= 2 && c.sour && c.party],
    ['skin','Mucha skin, poco daño','Copa preciosa, flores, humo y una rodaja deshidratada. Sabe a Sprite. Te vendieron el aspecto legendario.','League of Legends','cobre','Elegiste tres frutas y una bebida sin alcohol.', c => c.fruits >= 3 && c.zero],
    ['nook','Tom Nook pone la cuenta','Viniste a relajarte, decoraste toda la barra y terminaste pagando los ingredientes. Hasta en la fiesta tenés hipoteca.','Animal Crossing','plata','Combinaste playa, coco y una bebida sin alcohol.', c => c.beach && c.coconut && c.zero],
    ['canela','Canela ya lo anotó','La decoración está preciosa, la música acompaña y alguien dejó doce vasos en el suelo. Tu isla sigue sin las cinco estrellas.','Animal Crossing','oro','Combinaste playa, cinco frutas y sabor refrescante.', c => c.beach && c.fruits >= 5 && c.fresh],
    ['shimmer','Eso era Shimmer','Morado, brillante y de procedencia dudosa. El bartender dice que es su creación; vos ya estás viendo cuánto cuesta una prótesis en Piltover.','Arcane','plata','Descubriste un Blue Hawaiian o un Blue Lagoon.', c => /blue hawaiian|blue lagoon/.test(c.drink)],
    ['fallout','Refugio 33: barra libre','Se acabaron los ingredientes frescos. Quedan una lata, algo fluorescente y el optimismo obligatorio del anfitrión.','Fallout','plata','Combinaste aventura, vodka y cualquier fruta.', c => c.adventure && c.vodka && c.any],
    ['sweater','Sweater Weather','Afuera hace calor, pero vos necesitás un cóctel, luces bajas y fingir que esa persona te arruinó la vida para salir bien en la foto.','The Neighbourhood','plata','Combinaste cena, sabor cremoso y fuerza suave.', c => c.dinner && c.creamy && c.soft],
    ['minecraft','Poción de dudosa procedencia','Mezclaste lo que encontraste y salió algo verde. Falta descubrir si da visión nocturna o si toca tirar todo el caldero.','Minecraft','plata','Combinaste menta, limón y un plan de aventura.', c => c.mint && c.lemon && c.adventure],
    ['souls','YOU DIED','Primer intento: demasiado ácido. Segundo: demasiado dulce. Tercero: se acabó el limón. El jefe final era seguir la receta.','Dark Souls','oro','Descubriste tres recetas distintas de sabor ácido y tres de sabor dulce.', c => c.sours >= 3 && c.sweets >= 3],
    ['moe','Un Moe de confianza','La botella no tiene etiqueta, el vaso tiene historia y el dueño se ofende si preguntás qué lleva. Pero te saluda por tu nombre.','Los Simpson','cobre','Combinaste brandy y un plan de cena.', c => c.brandy && c.dinner],
    ['build-prohibida','La build prohibida','Ginebra, menta y maracuyá. Te reportaron por inventar, pero ahora todos están copiando la build. El meta era vos.','League of Legends','oro','Elegiste solo ginebra; exactamente limón, menta y maracuyá; sabor ácido, fuerza media y aventura improvisada.', c => exactCombo(c, 'Ginebra', ['Limón','Menta','Maracuyá'], 'Ácido', 'Medio', 'aventura')],
    ['ekko-salvador','El niño salvador','Mirá quién vino: el niño salvador. Cero alcohol y otra vez frente a la que te complica la vida. Vos le decís destino; Jinx ya está poniendo los ojos en blanco.','Arcane','oro','Elegiste sin alcohol; exactamente limón, menta y naranja; sabor refrescante, fuerza suave y aventura improvisada.', c => exactCombo(c, 'Sin alcohol', ['Limón','Menta','Naranja'], 'Refrescante', 'Suave', 'aventura')],
    ['redstone','Esto no sale en el crafteo','Vodka, fresa, sandía y limón. La mesa de crafteo no reconoce la receta, pero el del tutorial jura que funciona en esta versión.','Minecraft','oro','Elegiste solo vodka; exactamente fresa, sandía y limón; sabor dulce, fuerza media y fiesta hasta tarde.', c => exactCombo(c, 'Vodka', ['Fresa','Sandía','Limón'], 'Dulce', 'Medio', 'fiesta')],
    ['zaun-heroina','La Heroína de Zaun','Fresa, maracuyá y cero intención de caerle bien a Piltover. La copa quedó preciosa; el discurso contra el sistema ya venía con vos. Jinx aprobaría el nivel de drama.','Arcane','oro','Elegiste solo tequila; exactamente fresa, maracuyá y limón; sabor ácido, fuerza fuerte y fiesta hasta tarde.', c => exactCombo(c, 'Tequila', ['Fresa','Maracuyá','Limón'], 'Ácido', 'Fuerte', 'fiesta')],
    ['isla-sin-deudas','Cinco estrellas, cero deudas','Mango, maracuyá, menta y ni una gota de alcohol. Tu isla por fin prospera. Tom Nook ya está buscando qué cobrarte por las vistas.','Animal Crossing','oro','Elegiste sin alcohol; exactamente mango, maracuyá y menta; sabor refrescante, fuerza suave y tarde de playa.', c => exactCombo(c, 'Sin alcohol', ['Mango','Maracuyá','Menta'], 'Refrescante', 'Suave', 'playa')],
    ['hula-girl','Hula Girl','Piña, coco y cara de estar bien. La muñequita del tablero baila; vos seguís estacionado en la misma persona. Muy tropical el vaso para semejante atasco emocional.','The Neighbourhood','oro','Elegiste solo ron; exactamente piña, coco y durazno; sabor dulce, fuerza media y tarde de playa.', c => exactCombo(c, 'Ron', ['Piña','Coco','Durazno'], 'Dulce', 'Medio', 'playa')]
  ].map(b => ({id:b[0], name:b[1], text:b[2], category:b[3], rank:b[4], reason:b[5], test:b[6]})).concat(questionCatalog);
  // Rutas alternativas: se conservan nombres, remates, rangos y logros anteriores.
  const questionAlternatives = {
    saludar:{answers:[[19,1]], reason:'También: elegir quedarse en la fiesta en lugar de ir por tacos.'},
    produccion:{answers:[[13,2]], taste:c => c.any && c.soft, reason:'También: cualquier fruta, fuerza suave y proponer otro plan al llegar en la fecha equivocada.'},
    rapidos:{answers:[[18,0]], taste:c => c.any, reason:'También: cualquier fruta y aceptar salir sin preguntar el destino.'},
    nook:{answers:[[24,0]], taste:c => c.zero && c.coconut, reason:'También: sin alcohol, coco y aceptar el viaje con una mochila.'},
    canela:{answers:[[24,0]], taste:c => c.fruits >= 5 && c.fresh, reason:'También: cinco frutas, sabor refrescante y aceptar el viaje con una mochila.'},
    moe:{answers:[[22,1]], taste:c => c.brandy, reason:'También: brandy y defender el restaurante que recomendaste aunque la comida esté mala.'},
    'build-prohibida':{answers:[[18,0]], taste:c => exactCombo(c,'Ginebra',['Limón','Menta','Maracuyá'],'Ácido','Medio',c.selectedPlan), reason:'También: la misma base, frutas, sabor y fuerza, aceptando salir sin preguntar el destino; no requiere un plan concreto.'},
    redstone:{answers:[[19,1]], taste:c => exactCombo(c,'Vodka',['Fresa','Sandía','Limón'],'Dulce','Medio',c.selectedPlan), reason:'También: la misma base, frutas, sabor y fuerza, eligiendo quedarse en la fiesta; no requiere un plan concreto.'},
    'isla-sin-deudas':{answers:[[24,0]], taste:c => exactCombo(c,'Sin alcohol',['Mango','Maracuyá','Menta'],'Refrescante','Suave',c.selectedPlan), reason:'También: la misma base, frutas, sabor y fuerza, aceptando el viaje con una mochila; no requiere un plan concreto.'},
    apego:{answers:[[29,0]], taste:c => c.sweet, reason:'También podés obtenerla con sabor dulce y eligiendo ver todas las historias del crush.'},
    hielo:{answers:[[39,0]], taste:c => c.fresh && c.soft, reason:'También: refrescante y suave, admitiendo que te irías sin despedirte.'},
    notas:{answers:[[25,0],[29,0],[14,0]], reason:'También: escribirle al ex, ver todas las historias del crush y borrar la captura del chat equivocado.'},
    bluetooth:{answers:[[15,0]], taste:c => c.fresh, reason:'También: sabor refrescante y admitir que dijiste conocer al DJ sin conocerlo.'},
    lore:{answers:[[7,0],[8,3],[46,0]], reason:'También: aceptar la mímica, responder con un chiste y decirle al amigo que deje el show de la pelea.'},
    fuente:{answers:[[8,0]], taste:c => c.any, reason:'También: cualquier fruta e inventarte una respuesta con convicción.'},
    cine:{answers:[[7,0]], taste:c => c.orange, reason:'También: elegir naranja y aceptar hacer mímica frente a todos.'},
    sanando:{answers:[[25,0]], taste:c => c.sour, reason:'También: sabor ácido y decir que sí le escribirías al ex después de la fiesta.'},
    contacto:{answers:[[25,1]], taste:c => c.zero, reason:'También: sin alcohol y decir que no le escribirías al ex.'},
    videoclip:{answers:[[27,0]], taste:c => c.tropical >= 2, reason:'También: al menos dos frutas tropicales y proponer bailar a alguien que acabás de conocer.'},
    supp:{answers:[[3,1]], taste:c => c.bases >= 2, reason:'También: al menos dos bases y decir «Tuviste suerte» después de perder.'},
    'ekko-salvador':{answers:[[44,1]], taste:c => exactCombo(c,'Sin alcohol',['Limón','Menta','Naranja'],'Refrescante','Suave',c.selectedPlan), reason:'También: la misma base, frutas, sabor y fuerza, eligiendo salir de la pelea con tu amigo; no requiere un plan concreto.'},
    'zaun-heroina':{answers:[[43,0]], taste:c => exactCombo(c,'Tequila',['Fresa','Maracuyá','Limón'],'Ácido','Fuerte',c.selectedPlan), reason:'También: la misma base, frutas, sabor y fuerza, eligiendo mandar a la mierda a quien no deja de molestarte; no requiere un plan concreto.'},
    'hula-girl':{answers:[[27,0]], taste:c => exactCombo(c,'Ron',['Piña','Coco','Durazno'],'Dulce','Medio',c.selectedPlan), reason:'También: la misma base, frutas, sabor y fuerza, eligiendo proponer un baile; no requiere un plan concreto.'}
  };
  catalog.forEach(b => {
    const alt = questionAlternatives[b.id];
    if (!alt) return;
    const previous = b.test;
    b.test = c => previous(c) || (alt.answers.every(a => picked(c,a[0],a[1])) && (!alt.taste || alt.taste(c)));
    b.reason += ' ' + alt.reason;
  });
  function exactCombo(c, alcohol, fruits, style, strength, plan){
    return !c.any && c.selectedAlcohol.length === 1 && c.selectedAlcohol[0] === alcohol
      && c.selectedFruit.length === fruits.length && fruits.every(f => c.selectedFruit.includes(f))
      && c.selectedStyle === style && c.selectedStrength === strength && c.selectedPlan === plan;
  }
  const memory = new Map();
  function read(key){
    try { return JSON.parse(localStorage.getItem(key) || 'null') || memory.get(key); }
    catch (_) { return memory.get(key); }
  }
  function write(key, value){
    memory.set(key, value);
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Sigue funcionando sin almacenamiento. */ }
  }
  function normalize(name){ return String(name || '').trim().toLocaleLowerCase('es').replace(/\s+/g, ' '); }
  function validRecords(value){
    return Array.isArray(value) ? value.filter(r => r && typeof r.drink === 'string' && typeof r.style === 'string' && typeof r.plan === 'string') : [];
  }
  function validEarned(value){
    return Array.isArray(value) ? value.filter(id => catalog.some(b => b.id === id)) : [];
  }
  function keyFor(api){
    const name = normalize(api.draftName || (api.persona && api.persona.nombre));
    const scope = (new URLSearchParams(location.search).get('evento') || '').trim() || 'local';
    const prefix = 'cocteles_insignias_v2:' + encodeURIComponent(scope) + ':';
    if (typeof api.badgeAccountId === 'string' && api.badgeAccountId) return prefix + 'cuenta:' + encodeURIComponent(api.badgeAccountId);
    const named = prefix + 'nombre:' + encodeURIComponent(name);
    if (api.persona && normalize(api.persona.nombre) === name){
      const identified = prefix + 'id:' + encodeURIComponent(api.persona.id);
      // El guardado remoto puede asignar identidad después de descubrir el trago.
      const previous = read(named);
      if (previous){
        const existing = read(identified) || {};
        const combined = [...validRecords(existing.records), ...validRecords(previous.records)];
        const unique = [...new Map(combined.map(r => [JSON.stringify([r.drink,r.style,r.plan]),r])).values()];
        write(identified, {earned:[...new Set([...validEarned(existing.earned), ...validEarned(previous.earned)])], records:unique});
        memory.delete(named);
        try { localStorage.removeItem(named); } catch (_) { /* La copia ya está guardada. */ }
      }
      return identified;
    }
    if (name) return named;
    // Invitados sin nombre no comparten su colección con otras sesiones.
    let guest;
    try {
      guest = sessionStorage.getItem('cocteles_insignias_invitado');
      if (!guest){ guest = String(Date.now()) + Math.random().toString(36).slice(2); sessionStorage.setItem('cocteles_insignias_invitado', guest); }
    } catch (_) { guest = 'visita'; }
    return prefix + 'invitado:' + guest;
  }
  function collect(api, roundAnswers){
    if (!api.current) return [];
    const key = keyFor(api);
    const saved = read(key) || {};
    const earned = new Set(validEarned(saved.earned));
    const records = validRecords(saved.records);
    const first = k => [...api.sel[k]][0];
    const record = {drink:api.current.n, style:first('sabor') || '', plan:first('plan') || ''};
    if (!records.some(r => r.drink === record.drink && r.style === record.style && r.plan === record.plan)) records.push(record);
    const count = predicate => new Set(records.filter(predicate).map(r => r.drink)).size;
    // Sin alcohol omite la elección de fuerza. Conserva las combinaciones suaves
    // de insignias sin inventar una selección dentro de la partida compartida.
    const strengths = api.sel.fuerza.size ? [...api.sel.fuerza]
      : api.sel.alcohol.size === 1 && api.sel.alcohol.has('Sin alcohol') ? ['Suave'] : [];
    const c = {
      answers:normalizeAnswers(roundAnswers === undefined ? api.badgeAnswers : roundAnswers),
      selectedAlcohol:[...api.sel.alcohol], selectedFruit:[...api.sel.fruta],
      selectedStyles:[...api.sel.sabor], selectedStrengths:strengths,
      selectedStyle:record.style, selectedStrength:strengths[0], selectedPlan:record.plan,
      drink:api.current.n.toLowerCase(), ingredients:(api.current.i || []).length,
      bases:[...api.sel.alcohol].filter(a => a !== 'Sin alcohol').length,
      fruits:api.sel.fruta.size, any:api.fruitAny === true,
      sweet:first('sabor') === 'Dulce', sour:first('sabor') === 'Ácido',
      creamy:first('sabor') === 'Cremoso', fresh:first('sabor') === 'Refrescante',
      soft:strengths[0] === 'Suave', medium:strengths[0] === 'Medio', strong:strengths[0] === 'Fuerte',
      party:record.plan === 'fiesta', dinner:record.plan === 'cena', beach:record.plan === 'playa', adventure:record.plan === 'aventura',
      zero:api.sel.alcohol.has('Sin alcohol'), whisky:api.sel.alcohol.has('Whisky'), brandy:api.sel.alcohol.has('Brandy'), vodka:api.sel.alcohol.has('Vodka'),
      lemon:api.sel.fruta.has('Limón'), orange:api.sel.fruta.has('Naranja'), mint:api.sel.fruta.has('Menta'), coconut:api.sel.fruta.has('Coco'),
      tropical:['Piña','Mango','Maracuyá','Coco'].filter(f => api.sel.fruta.has(f)).length,
      discoveries:count(() => true), dinners:count(r => r.plan === 'cena'),
      sours:count(r => r.style === 'Ácido'), sweets:count(r => r.style === 'Dulce'), styles:records.map(r => r.style)
    };
    const fresh = new Set();
    catalog.forEach(b => { if (b.test(c) && !earned.has(b.id)){ earned.add(b.id); fresh.add(b.id); } });
    write(key, {earned:[...earned], records});
    return catalog.filter(b => earned.has(b.id)).map(b => ({...b, isNew:fresh.has(b.id)}));
  }
  function collection(api){
    const saved = read(keyFor(api)) || {};
    const earned = new Set(validEarned(saved.earned));
    return catalog.filter(b => earned.has(b.id)).map(b => ({...b,isNew:false}));
  }
  function featured(api){
    const owned = new Set(collection(api).map(b => b.id));
    const ids = validEarned(read(keyFor(api) + ':destacadas'));
    return [...new Set(ids)].filter(id => owned.has(id)).slice(0,3);
  }
  function chooseFeatured(api, ids){
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) return {ok:false,error:'invalid'};
    const unique = [...new Set(ids)];
    if (unique.length > 3) return {ok:false,error:'limit'};
    const owned = new Set(collection(api).map(b => b.id));
    if (unique.some(id => !owned.has(id))) return {ok:false,error:'locked'};
    const key = keyFor(api) + ':destacadas';
    try {
      localStorage.setItem(key,JSON.stringify(unique)); memory.set(key,unique);
      return {ok:true};
    } catch (_) { return {ok:false,error:'storage'}; }
  }
  function guestCollection(api){ return api.badgeAccountId ? collection({...api,badgeAccountId:null}) : []; }
  function importGuest(api){
    if (!api.badgeAccountId) return {ok:false,error:'account'};
    const sourceKey = keyFor({...api,badgeAccountId:null}), targetKey = keyFor(api);
    const previous = read(sourceKey) || {}, current = read(targetKey) || {};
    const records = [...validRecords(current.records),...validRecords(previous.records)];
    const next = {earned:[...new Set([...validEarned(current.earned),...validEarned(previous.earned)])],
      records:[...new Map(records.map(r=>[JSON.stringify([r.drink,r.style,r.plan]),r])).values()]};
    // Solo se retiran de la visita después de confirmar su conservación en la cuenta.
    try {
      localStorage.setItem(targetKey,JSON.stringify(next)); memory.set(targetKey,next);
      localStorage.setItem(sourceKey,JSON.stringify({earned:[],records:[]})); memory.set(sourceKey,{earned:[],records:[]});
      return {ok:true};
    } catch (_) { return {ok:false,error:'storage'}; }
  }
  return {collect, ranks, collection, featured, chooseFeatured, guestCollection, importGuest};
})();
