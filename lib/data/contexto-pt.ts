// Contexto histórico de cada série/reinado de Portugal (anos de reinado +
// cognome + nota histórica). Texto próprio, factos conhecidos da história de
// Portugal — para o cartão e o cabeçalho da série. Não substitui fontes oficiais.

export interface ContextoSerie {
  periodo: string       // anos de reinado/série
  cognome?: string
  contexto: string
}

export const CONTEXTO: Record<string, ContextoSerie> = {
  // ── Monarquia ──
  'D. Afonso I': { periodo: '1139–1185', cognome: 'o Conquistador', contexto: 'Primeiro Rei de Portugal. Após a vitória de Ourique (1139) e o reconhecimento pelo Tratado de Zamora (1143), fundou o reino e tomou Lisboa aos mouros (1147). Cunhou as primeiras moedas portuguesas — dinheiros e morabitinos.' },
  'D. Sancho I': { periodo: '1185–1211', cognome: 'o Povoador', contexto: 'Dedicou-se a povoar e consolidar o reino, fundando vilas e concelhos e juntando um grande tesouro. Cunhou o morabitino de ouro. Perdeu e recuperou praças no Sul face aos Almóadas.' },
  'D. Afonso II': { periodo: '1211–1223', cognome: 'o Gordo', contexto: 'Promulgou as primeiras leis gerais do reino nas Cortes de Coimbra (1211) e organizou a administração e a fazenda. Entrou em conflito com a Igreja, que o excomungou.' },
  'D. Beatriz': { periodo: '1383–1384', cognome: 'rainha contestada', contexto: 'Filha de D. Fernando I e casada com Juan I de Castela; a sua aclamação desencadeou a Crise de 1383-85. A resistência liderada pelo Mestre de Avis culminou em Aljubarrota (1385).' },
  'D. Henrique I': { periodo: '1578–1580', cognome: 'o Cardeal-Rei', contexto: 'Cardeal e tio-avô de D. Sebastião, sucedeu-lhe já idoso e sem descendência. A sua morte, sem herdeiro claro, abriu a crise sucessória que levou à União Ibérica.' },
  'Governadores': { periodo: '1580', cognome: 'Governadores do Reino', contexto: 'Junta de governadores que administrou o reino no interregno de 1580, entre a morte do Cardeal-Rei e a aclamação de Filipe I, durante a disputa sucessória.' },
  'D. António I': { periodo: '1580–1583', cognome: 'o Prior do Crato', contexto: 'Aclamado Rei pela resistência à União Ibérica, foi derrotado em Alcântara (1580) por Espanha. Continuou a luta a partir dos Açores e do exílio, cunhando moeda própria de resistência.' },
  'D. Pedro (Príncipe Regente)': { periodo: '1667–1683', cognome: 'Regência', contexto: 'Assumiu a regência após afastar o irmão D. Afonso VI (1667). No seu governo reconheceu-se a independência (Paz de 1668, fim da Guerra da Restauração). Viria a reinar como D. Pedro II.' },
  'D. Sancho II': { periodo: '1223–1248', cognome: 'o Capelo', contexto: 'Avançou a Reconquista no Alentejo e Algarve, mas o reinado terminou em guerra civil: foi deposto pelo irmão, o futuro Afonso III, com apoio do papado.' },
  'D. Afonso III': { periodo: '1248–1279', cognome: 'o Bolonhês', contexto: 'Concluiu a Reconquista com a tomada do Algarve (1249), fixando as fronteiras de Portugal — das mais antigas da Europa. Reuniu as primeiras Cortes com o povo (Leiria, 1254).' },
  'D. Dinis I': { periodo: '1279–1325', cognome: 'o Lavrador / o Rei-Trovador', contexto: 'Fundou a Universidade (1290), incentivou a agricultura e o comércio, mandou plantar o Pinhal de Leiria e tornou o português língua oficial. Grande poeta galego-português.' },
  'D. Afonso IV': { periodo: '1325–1357', cognome: 'o Bravo', contexto: 'Venceu, com Castela, a decisiva Batalha do Salado (1340) contra os Mariníadas. O seu reinado ficou marcado pelo drama de Inês de Castro, mandada executar por sua ordem.' },
  'D. Pedro I': { periodo: '1357–1367', cognome: 'o Justiceiro / o Cru', contexto: 'Célebre pela justiça implacável e pelo amor a Inês de Castro, que terá feito coroar postumamente. Reinado de paz e prosperidade.' },
  'D. Fernando I': { periodo: '1367–1383', cognome: 'o Formoso', contexto: 'As guerras com Castela e o casamento com Leonor Teles abriram a crise de 1383-85. Promoveu uma importante reforma monetária e a Lei das Sesmarias.' },
  'D. João I': { periodo: '1385–1433', cognome: 'o de Boa Memória', contexto: 'Fundador da Dinastia de Avis após a vitória de Aljubarrota (1385), que garantiu a independência face a Castela. Iniciou a expansão com a tomada de Ceuta (1415).' },
  'D. Duarte I': { periodo: '1433–1438', cognome: 'o Eloquente / o Rei-Filósofo', contexto: 'Rei culto, autor do «Leal Conselheiro». O reinado curto foi ensombrado pelo desastre de Tânger (1437), em que o infante D. Fernando ficou cativo.' },
  'D. Afonso V': { periodo: '1438–1481', cognome: 'o Africano', contexto: 'Conquistou praças no Norte de África (Alcácer Ceguer, Arzila, Tânger), daí o cognome. Apoiou as navegações do Infante D. Henrique ao longo da costa africana.' },
  'D. João II': { periodo: '1481–1495', cognome: 'o Príncipe Perfeito', contexto: 'Centralizou o poder real e relançou os Descobrimentos: dobrou o Cabo da Boa Esperança (Bartolomeu Dias, 1488) e negociou o Tratado de Tordesilhas (1494) com Castela.' },
  'D. Manuel I': { periodo: '1495–1521', cognome: 'o Venturoso', contexto: 'Auge dos Descobrimentos: caminho marítimo para a Índia (Vasco da Gama, 1498) e chegada ao Brasil (1500). O ouro e as especiarias deram origem às ricas moedas «português» e ao estilo manuelino.' },
  'D. João III': { periodo: '1521–1557', cognome: 'o Piedoso / o Colonizador', contexto: 'Consolidou o império no Oriente e iniciou a colonização do Brasil (capitanias). Introduziu a Inquisição (1536) e entregou a educação aos Jesuítas.' },
  'D. Sebastião': { periodo: '1557–1578', cognome: 'o Desejado', contexto: 'Morreu sem descendência na Batalha de Alcácer-Quibir (1578), em Marrocos, abrindo a crise sucessória que levaria à União Ibérica. Origem do mito do «Sebastianismo».' },
  'D. Filipe I': { periodo: '1581–1598', cognome: 'o Prudente (Filipe II de Espanha)', contexto: 'Primeiro rei da Dinastia Filipina e da União Ibérica, aclamado nas Cortes de Tomar (1581) com garantias de autonomia. As moedas mantiveram a tipologia portuguesa.' },
  'D. Filipe II': { periodo: '1598–1621', cognome: 'o Pio (Filipe III de Espanha)', contexto: 'Reinado de relativa paz interna, mas de crescente desgaste com a perda de praças no Oriente para holandeses e ingleses. Visitou Portugal em 1619.' },
  'D. Filipe III': { periodo: '1621–1640', cognome: 'o Cobiçado (Filipe IV de Espanha)', contexto: 'O aumento de impostos e a perda de autonomia geraram revoltas que culminaram na Restauração da Independência (1.º de Dezembro de 1640), fim da União Ibérica.' },
  'D. João IV': { periodo: '1640–1656', cognome: 'o Restaurador', contexto: 'Aclamado rei após a Restauração de 1640, fundou a Dinastia de Bragança. Reorganizou o reino e a moeda durante a longa Guerra da Restauração contra Espanha.' },
  'D. Afonso VI': { periodo: '1656–1683', cognome: 'o Vitorioso', contexto: 'No seu reinado venceu-se a Guerra da Restauração (vitórias de Ameixial e Montes Claros) e reconheceu-se a independência (1668). Doente, foi afastado pelo irmão D. Pedro, regente desde 1668.' },
  'D. Pedro II': { periodo: '1683–1706', cognome: 'o Pacífico', contexto: 'O ouro do Brasil começou a inundar Portugal, permitindo abundante cunhagem de moedas de ouro. Assinou o Tratado de Methuen (1703) com a Inglaterra.' },
  'D. João V': { periodo: '1706–1750', cognome: 'o Magnânimo / o Rei-Sol Português', contexto: 'Apogeu do ouro brasileiro e do barroco (Mafra, Aqueduto das Águas Livres). Cunharam-se as famosas dobras e peças de ouro; o luxo da corte rivalizava com o de Versalhes.' },
  'D. José I': { periodo: '1750–1777', cognome: 'o Reformador', contexto: 'Reinado dominado pelo Marquês de Pombal: reconstrução de Lisboa após o terramoto de 1755, expulsão dos Jesuítas e modernização económica. Reforma monetária de 1750.' },
  'D. Maria I e D. Pedro III': { periodo: '1777–1786', cognome: 'reinado conjunto', contexto: 'D. Maria I reinou com o tio e marido D. Pedro III. A «Viradeira» afastou Pombal. As moedas trazem os bustos do casal real.' },
  'D. Maria I': { periodo: '1786–1816', cognome: 'a Piedosa / a Louca', contexto: 'Após a morte de D. Pedro III e do filho, adoeceu mentalmente; o filho D. João assumiu a regência em 1792. As Invasões Francesas levaram a corte para o Brasil (1807).' },
  'D. João (Príncipe Regente)': { periodo: '1799–1816', cognome: 'Regência', contexto: 'Regente por incapacidade da mãe D. Maria I. Perante a invasão de Junot, transferiu a corte para o Brasil (1807) e elevou-o a Reino Unido (1815).' },
  'D. João VI': { periodo: '1816–1826', cognome: 'o Clemente', contexto: 'Primeiro rei do Reino Unido de Portugal, Brasil e Algarves. Regressou a Lisboa em 1821 após a Revolução Liberal; o Brasil tornou-se independente em 1822.' },
  'D. Pedro IV': { periodo: '1826–1828', cognome: 'o Rei-Soldado / o Libertador', contexto: 'Imperador do Brasil e rei de Portugal por breves meses, outorgou a Carta Constitucional (1826) e abdicou na filha D. Maria II, desencadeando a luta liberal.' },
  'D. Miguel I': { periodo: '1828–1834', cognome: 'o Absolutista', contexto: 'Usurpou o trono e restaurou o absolutismo, provocando a Guerra Civil (Liberais vs. Absolutistas, 1828-1834). Derrotado, exilou-se após a Convenção de Évora-Monte.' },
  'D. Maria II': { periodo: '1834–1853', cognome: 'a Educadora', contexto: 'Restaurada no trono após a vitória liberal, viveu um reinado agitado (Setembrismo, Cabralismo, Patuleia). Em 1835 nasceu o real moderno; consolidou-se o sistema constitucional.' },
  'D. Pedro V': { periodo: '1853–1861', cognome: 'o Esperançoso', contexto: 'Rei culto e modernizador: caminhos-de-ferro, telégrafo e estradas. Muito amado, morreu jovem de febre tifóide, o que abalou o país.' },
  'D. Luís I': { periodo: '1861–1889', cognome: 'o Popular', contexto: 'Reforma monetária de 1854 fixou o padrão-ouro e o real como unidade. Reinado de estabilidade e desenvolvimento (Fontismo), cultura e expansão africana.' },
  'D. Carlos I': { periodo: '1889–1908', cognome: 'o Diplomata / o Martirizado', contexto: 'Enfrentou o Ultimato Inglês (1890) e duas bancarrotas. A crise política levou à ditadura de João Franco e ao Regicídio de 1908, em que foi assassinado com o herdeiro.' },
  'D. Manuel II': { periodo: '1908–1910', cognome: 'o Patriota / o Desventurado', contexto: 'Último rei de Portugal, subiu ao trono jovem após o Regicídio. A Implantação da República (5 de Outubro de 1910) levou-o ao exílio em Inglaterra.' },

  // ── República · Escudo ──
  '1ª República': { periodo: '1910–1926', contexto: 'Após a queda da Monarquia, a moeda decimalizou-se: o escudo (= 100 centavos) substituiu o real em 1911. Período instável, com cunhagens de centavos em bronze e prata.' },
  'Estado Novo': { periodo: '1926–1974', contexto: 'Regime autoritário chefiado por António de Oliveira Salazar e, depois, Marcello Caetano. Moeda estável; emissões comemorativas em prata (Centenários de 1940, Navegadores).' },
  'Escudo · Circulação': { periodo: '1974–2001', contexto: 'Após o 25 de Abril de 1974, a 2.ª República manteve o escudo até à entrada do euro. Moeda corrente em cuproníquel, latão e bronze, com a caravela e o escudo nacional.' },
  'Escudo · Coleção Prata': { periodo: '1974–2001', contexto: 'Numerosas comemorativas de coleção em prata (250$, 500$, 1000$…) sobre temas históricos: Descobrimentos, Património Mundial, figuras nacionais.' },
  'Escudo · Coleção Ouro': { periodo: '1987–2001', contexto: 'Séries de coleção em ouro, sobretudo dedicadas aos Descobrimentos Portugueses, emitidas pela INCM em tiragens limitadas.' },
  'Escudo · Coleção Paládio/Platina': { periodo: '1987–2000', contexto: 'Emissões de coleção em metais nobres raros (paládio e platina), de tiragem muito reduzida, dentro das séries dos Descobrimentos.' },

  // ── Euro ──
  'ECU (pré-euro)': { periodo: '1991–1998', contexto: 'Antes do euro, Portugal cunhou moedas em ECU (European Currency Unit), de coleção, com figuras dos Descobrimentos — antecâmara da moeda única.' },
  'Euro · Circulação': { periodo: '2002–', contexto: 'Desde 2002, as 8 moedas de circulação (1 cêntimo a 2 euros) com os selos reais de D. Afonso Henriques e o castelo, desenho de Vítor Manuel Fernandes dos Santos.' },
  'Euro · Comemorativas 2€': { periodo: '2007–', contexto: 'Moedas de 2 € comemorativas, as únicas de circulação que a zona euro permite para celebrar efemérides (Tratado de Roma, presidências, aniversários).' },
  'Euro · Coleção': { periodo: '1999–', contexto: 'Moedas de coleção em ouro e prata (5 €, 10 €, 50 €…) que não circulam, sobre temas culturais, históricos e europeus, emitidas pela INCM.' },

  // ── Regiões ──
  'Açores': { periodo: '1750–1901', contexto: 'Os Açores tiveram emissões próprias em réis, muitas vezes por contramarca sobre moedas do continente ou estrangeiras, devido à escassez de numerário no arquipélago.' },
  'Madeira': { periodo: '1750–1901', contexto: 'A Madeira teve cunhagens e contramarcas próprias em réis, para suprir a falta de moeda corrente na ilha durante o período monárquico.' },
}
