// =========================================================================
// BusOra Places & Smart Geocoding Service
// Provides real-time Google Maps-style autocomplete suggestions,
// robust village/college geocoding, and driving route computation.
// =========================================================================

// Verified Indian College & Transit Regional Gazetteer for instant 0ms suggestions
export const VERIFIED_PLACES = [
  // Primary Featured College
  {
    id: 'vp-vemu',
    name: 'Vemu Institute of Technology',
    secondary: 'P.Kothakota, Pakala-Chittoor Highway, Near Pakala, Chittoor Dist, Andhra Pradesh',
    lat: 13.3420,
    lng: 79.0830,
    type: 'college',
    keywords: ['vemu', 'vemu institute of technology', 'vemu college', 'vemu tech', 'vemut', 'kothakota', 'p.kothakota', 'pakala', 'chittoor', 'college', 'campus']
  },
  {
    id: 'vp-pkothakota',
    name: 'P.Kothakota Village (Vemu Junction)',
    secondary: 'Pakala Mandal, Chittoor District, Andhra Pradesh',
    lat: 13.3450,
    lng: 79.0810,
    type: 'village',
    keywords: ['p.kothakota', 'kothakota', 'vemu junction', 'pakala', 'chittoor']
  },
  {
    id: 'vp-putalapattu',
    name: 'Putalapattu Junction',
    secondary: 'Putalapattu Mandal, Chittoor District, Andhra Pradesh',
    lat: 13.3850,
    lng: 79.0920,
    type: 'village',
    keywords: ['putalapattu', 'putalapattu junction', 'chittoor highway']
  },
  // Universities & Engineering Colleges
  {
    id: 'vp-sv-univ',
    name: 'SV University Campus (Sri Venkateswara)',
    secondary: 'Tirupati, Andhra Pradesh',
    lat: 13.6290,
    lng: 79.4005,
    type: 'university',
    keywords: ['sv university', 'svu', 'sri venkateswara university', 'tirupati', 'campus', 'college', 'sv']
  },
  {
    id: 'vp-svce',
    name: 'SV College of Engineering (SVCE)',
    secondary: 'Karakambadi Road, Tirupati, Andhra Pradesh',
    lat: 13.6625,
    lng: 79.4795,
    type: 'college',
    keywords: ['svce', 'sv college of engineering', 'sv college', 'karakambadi', 'tirupati']
  },
  {
    id: 'vp-sv-med',
    name: 'SV Medical College (SVMC)',
    secondary: 'Alipiri Road, Tirupati, Andhra Pradesh',
    lat: 13.6370,
    lng: 79.4080,
    type: 'college',
    keywords: ['sv medical college', 'svmc', 'sv medical', 'ruia hospital', 'tirupati']
  },
  {
    id: 'vp-sv-arts',
    name: 'SV Arts College',
    secondary: 'Balaji Colony, Tirupati, Andhra Pradesh',
    lat: 13.6310,
    lng: 79.4180,
    type: 'college',
    keywords: ['sv arts college', 'sv arts', 'balaji colony', 'tirupati']
  },
  {
    id: 'vp-sv-poly',
    name: 'SV Government Polytechnic College',
    secondary: 'KT Road, Tirupati, Andhra Pradesh',
    lat: 13.6350,
    lng: 79.4120,
    type: 'college',
    keywords: ['sv polytechnic', 'polytechnic college', 'kt road', 'tirupati']
  },
  {
    id: 'vp-mbu',
    name: 'Mohan Babu University / Sree Vidyanikethan',
    secondary: 'A.Rangampet, Chandragiri Mandal, Tirupati',
    lat: 13.6180,
    lng: 79.2965,
    type: 'university',
    keywords: ['sree vidyanikethan', 'vidyanikethan', 'mohan babu university', 'mbu', 'rangampet', 'a.rangampet']
  },
  {
    id: 'vp-iit-tpt',
    name: 'IIT Tirupati (Permanent Campus)',
    secondary: 'Yerpedu, Tirupati District, Andhra Pradesh',
    lat: 13.7120,
    lng: 79.5930,
    type: 'university',
    keywords: ['iit tirupati', 'iit', 'yerpedu', 'indian institute of technology']
  },
  {
    id: 'vp-iiser',
    name: 'IISER Tirupati',
    secondary: 'Srinivasapuram, Karakambadi Road, Tirupati',
    lat: 13.6550,
    lng: 79.4670,
    type: 'university',
    keywords: ['iiser tirupati', 'iiser', 'science institute', 'tirupati']
  },
  {
    id: 'vp-spmvv',
    name: 'Sri Padmavati Mahila Visvavidyalayam (SPMVV)',
    secondary: 'Padmavathi Nagar, Tirupati, Andhra Pradesh',
    lat: 13.6340,
    lng: 79.3980,
    type: 'university',
    keywords: ['spmvv', 'mahila university', 'padmavati university', 'womens university', 'tirupati']
  },
  {
    id: 'vp-chadalawada',
    name: 'Chadalawada Ramanamma Engineering College',
    secondary: 'Chadalawada Nagar, Renigunta Road, Tirupati',
    lat: 13.6420,
    lng: 79.4680,
    type: 'college',
    keywords: ['chadalawada', 'ramanamma', 'crec', 'renigunta road', 'tirupati']
  },
  {
    id: 'vp-sietk',
    name: 'Siddharth Institute of Engineering (SIETK)',
    secondary: 'Puttur, Tirupati District, Andhra Pradesh',
    lat: 13.4380,
    lng: 79.5520,
    type: 'college',
    keywords: ['siddharth college', 'sietk', 'puttur engineering', 'puttur']
  },
  {
    id: 'vp-mits',
    name: 'Madanapalle Institute of Technology & Science (MITS)',
    secondary: 'Angallu, Madanapalle, Andhra Pradesh',
    lat: 13.6280,
    lng: 78.4790,
    type: 'college',
    keywords: ['mits', 'madanapalle institute', 'angallu', 'madanapalle']
  },
  {
    id: 'vp-vemu',
    name: 'Vemu Institute of Technology',
    secondary: 'P.Kothakota, Pakala-Chittoor Highway, Andhra Pradesh',
    lat: 13.3420,
    lng: 79.0830,
    type: 'college',
    keywords: ['vemu', 'vemu institute', 'kothakota', 'pakala', 'chittoor']
  },
  {
    id: 'vp-sitams',
    name: 'SITAMS Engineering College',
    secondary: 'Murukambattu, Chittoor, Andhra Pradesh',
    lat: 13.2530,
    lng: 79.0880,
    type: 'college',
    keywords: ['sitams', 'sreenivasa institute', 'murukambattu', 'chittoor']
  },

  // Major Stations & Transit Hubs
  {
    id: 'vp-tpt-bus',
    name: 'Tirupati Central Bus Station (APSRTC Bus Stand)',
    secondary: 'RTC Central Complex, Tirupati, Andhra Pradesh',
    lat: 13.6258,
    lng: 79.4223,
    type: 'bus_station',
    keywords: ['tirupati bus stand', 'apsrtc bus stand', 'central bus stand', 'rtc bus stand', 'tirupati']
  },
  {
    id: 'vp-tpt-rly',
    name: 'Tirupati Main Railway Station',
    secondary: 'Station Road, Tirupati, Andhra Pradesh',
    lat: 13.6288,
    lng: 79.4192,
    type: 'railway_station',
    keywords: ['tirupati railway station', 'tirupati station', 'rly station', 'station', 'tirupati']
  },
  {
    id: 'vp-alipiri',
    name: 'Alipiri Foothills / Bus Terminal',
    secondary: 'Alipiri Toll Gate, Tirupati, Andhra Pradesh',
    lat: 13.6480,
    lng: 79.3940,
    type: 'transit_hub',
    keywords: ['alipiri', 'alipiri gate', 'alipiri bus stand', 'tirupati']
  },
  {
    id: 'vp-renigunta-stn',
    name: 'Renigunta Junction Railway Station',
    secondary: 'Renigunta, Tirupati, Andhra Pradesh',
    lat: 13.6500,
    lng: 79.5150,
    type: 'railway_station',
    keywords: ['renigunta', 'renigunta station', 'renigunta junction', 'railway']
  },
  {
    id: 'vp-tpt-airport',
    name: 'Tirupati International Airport',
    secondary: 'Renigunta, Tirupati, Andhra Pradesh',
    lat: 13.6320,
    lng: 79.5440,
    type: 'airport',
    keywords: ['tirupati airport', 'renigunta airport', 'airport']
  },
  {
    id: 'vp-chandragiri-bus',
    name: 'Chandragiri Bus Stand',
    secondary: 'Main Road, Chandragiri, Andhra Pradesh',
    lat: 13.5842,
    lng: 79.3167,
    type: 'bus_station',
    keywords: ['chandragiri bus stand', 'chandragiri', 'rtc bus stand chandragiri']
  },
  {
    id: 'vp-chandragiri-fort',
    name: 'Chandragiri Fort & Heritage Palace',
    secondary: 'Chandragiri, Andhra Pradesh',
    lat: 13.5830,
    lng: 79.3053,
    type: 'landmark',
    keywords: ['chandragiri fort', 'chandragiri palace', 'fort chandragiri']
  },
  {
    id: 'vp-pakala-junc',
    name: 'Pakala Junction & RTC Bus Stand',
    secondary: 'Pakala, Tirupati District, Andhra Pradesh',
    lat: 13.4560,
    lng: 79.1170,
    type: 'bus_station',
    keywords: ['pakala', 'pakala junction', 'pakala bus stand', 'pakala station']
  },
  {
    id: 'vp-chittoor-bus',
    name: 'Chittoor Old & New RTC Bus Stand',
    secondary: 'Kongareddy Palli, Chittoor, Andhra Pradesh',
    lat: 13.2172,
    lng: 79.1003,
    type: 'bus_station',
    keywords: ['chittoor', 'chittoor bus stand', 'rtc bus stand chittoor', 'chittoor station']
  },
  {
    id: 'vp-srikalahasti',
    name: 'Srikalahasti RTC Bus Stand',
    secondary: 'Panagal, Srikalahasti, Andhra Pradesh',
    lat: 13.7530,
    lng: 79.7020,
    type: 'bus_station',
    keywords: ['srikalahasti', 'srikalahasti bus stand', 'temple', 'kalahasti']
  },
  {
    id: 'vp-puttur-bus',
    name: 'Puttur Bus Stand',
    secondary: 'Main Road, Puttur, Andhra Pradesh',
    lat: 13.4410,
    lng: 79.5530,
    type: 'bus_station',
    keywords: ['puttur', 'puttur bus stand', 'puttur station']
  },
  {
    id: 'vp-pileru-bus',
    name: 'Pileru RTC Bus Stand',
    secondary: 'Kadapa-Tirupati Highway, Pileru, Andhra Pradesh',
    lat: 13.6920,
    lng: 78.9380,
    type: 'bus_station',
    keywords: ['pileru', 'pileru bus stand', 'pileru station']
  },
  {
    id: 'vp-madanapalle-bus',
    name: 'Madanapalle RTC Bus Stand',
    secondary: 'Neerugattu Palli, Madanapalle, Andhra Pradesh',
    lat: 13.5510,
    lng: 78.5020,
    type: 'bus_station',
    keywords: ['madanapalle', 'madanapalle bus stand', 'rtc bus stand madanapalle']
  },
  {
    id: 'vp-palamaner-bus',
    name: 'Palamaner RTC Bus Stand',
    secondary: 'NH 75 Highway, Palamaner, Andhra Pradesh',
    lat: 13.2000,
    lng: 78.7500,
    type: 'bus_station',
    keywords: ['palamaner', 'palamaner bus stand', 'palamaner station']
  },

  // Prominent Villages & Transit Stops
  {
    id: 'vp-narasingapuram',
    name: 'Narasingapuram Village',
    secondary: 'Near Chandragiri Railway Gate, Tirupati',
    lat: 13.6117,
    lng: 79.3123,
    type: 'village',
    keywords: ['narasingapuram', 'narasingapuram village', 'chandragiri']
  },
  {
    id: 'vp-srinivasa-mangapuram',
    name: 'Srinivasa Mangapuram (Kalyana Venkateswara Temple)',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.6160,
    lng: 79.3300,
    type: 'village',
    keywords: ['srinivasa mangapuram', 'mangapuram', 'temple', 'chandragiri']
  },
  {
    id: 'vp-arangampet',
    name: 'A.Rangampet Village',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.6190,
    lng: 79.2970,
    type: 'village',
    keywords: ['a.rangampet', 'rangampet', 'vidyanikethan', 'chandragiri']
  },
  {
    id: 'vp-panapakam',
    name: 'Panapakam Village',
    secondary: 'Pakala Mandal, Tirupati District',
    lat: 13.5220,
    lng: 79.2260,
    type: 'village',
    keywords: ['panapakam', 'panapakam village', 'pakala road']
  },
  {
    id: 'vp-ramapuram',
    name: 'Ramapuram Village',
    secondary: 'Chandragiri-Pakala Route, Andhra Pradesh',
    lat: 13.5350,
    lng: 79.2550,
    type: 'village',
    keywords: ['ramapuram', 'ramapuram village']
  },
  {
    id: 'vp-bakarapet',
    name: 'Bakarapet Village & Forest Junction',
    secondary: 'Chinnagottigallu Mandal, Tirupati',
    lat: 13.6840,
    lng: 79.1820,
    type: 'village',
    keywords: ['bakarapet', 'bakarapeta', 'talakona route']
  },
  {
    id: 'vp-talakona',
    name: 'Talakona Waterfalls & Eco Park',
    secondary: 'Sri Venkateswara National Park, Andhra Pradesh',
    lat: 13.7990,
    lng: 79.2150,
    type: 'landmark',
    keywords: ['talakona', 'waterfalls', 'talakona forest']
  },
  {
    id: 'vp-tiruchanur',
    name: 'Tiruchanur (Padmavathi Ammavari Temple)',
    secondary: 'Tirupati Rural, Andhra Pradesh',
    lat: 13.6120,
    lng: 79.4530,
    type: 'village',
    keywords: ['tiruchanur', 'padmavathi temple', 'alivelumangapuram']
  },
  {
    id: 'vp-karakambadi',
    name: 'Karakambadi Village',
    secondary: 'Renigunta Mandal, Tirupati, Andhra Pradesh',
    lat: 13.6700,
    lng: 79.4950,
    type: 'village',
    keywords: ['karakambadi', 'karakambadi road', 'industrial area']
  },
  {
    id: 'vp-yerpedu',
    name: 'Yerpedu Town & Mandal',
    secondary: 'Tirupati District, Andhra Pradesh',
    lat: 13.6850,
    lng: 79.6050,
    type: 'village',
    keywords: ['yerpedu', 'yerpedu junction', 'iit route']
  },
  {
    id: 'vp-gajulamandyam',
    name: 'Gajulamandyam Industrial Estate',
    secondary: 'Renigunta Mandal, Tirupati District',
    lat: 13.5950,
    lng: 79.5550,
    type: 'village',
    keywords: ['gajulamandyam', 'sugar factory', 'renigunta road']
  },
  {
    id: 'vp-thummalagunta',
    name: 'Thummalagunta Village',
    secondary: 'Tirupati Rural, Andhra Pradesh',
    lat: 13.6220,
    lng: 79.3850,
    type: 'village',
    keywords: ['thummalagunta', 'kalyani dam road', 'tirupati']
  },
  {
    id: 'vp-mrpalle',
    name: 'MR Palle (Mahati Circle)',
    secondary: 'Tirupati Urban, Andhra Pradesh',
    lat: 13.6150,
    lng: 79.4080,
    type: 'village',
    keywords: ['mr palle', 'm.r.palle', 'air bypass road', 'tirupati']
  },
  {
    id: 'vp-avilala',
    name: 'Avilala Village',
    secondary: 'Tirupati Rural, Andhra Pradesh',
    lat: 13.6180,
    lng: 79.4320,
    type: 'village',
    keywords: ['avilala', 'avilala circle', 'tirupati']
  },
  {
    id: 'vp-daminedu',
    name: 'Daminedu Village',
    secondary: 'Tirupati Urban, Andhra Pradesh',
    lat: 13.6290,
    lng: 79.4650,
    type: 'village',
    keywords: ['daminedu', 'tirupati bypass']
  },
  {
    id: 'vp-cherlopalli',
    name: 'Cherlopalli Village',
    secondary: 'Chandragiri Mandal, Tirupati',
    lat: 13.6250,
    lng: 79.3800,
    type: 'village',
    keywords: ['cherlopalli', 'cherlopalli cross', 'chandragiri']
  },
  {
    id: 'vp-peruru',
    name: 'Peruru Heritage Village',
    secondary: 'Tirupati Rural, Andhra Pradesh',
    lat: 13.6100,
    lng: 79.3800,
    type: 'village',
    keywords: ['peruru', 'perur', 'chandragiri road']
  },
  {
    id: 'vp-agarala',
    name: 'Agarala Village',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.5824,
    lng: 79.2868,
    type: 'village',
    keywords: ['agarala', 'agarala village', 'ithepalle', 'chandragiri']
  },
  {
    id: 'vp-perumallapalli',
    name: 'Perumallapalli Village',
    secondary: 'Tirupati Rural Mandal, Andhra Pradesh',
    lat: 13.6260,
    lng: 79.3750,
    type: 'village',
    keywords: ['perumallapalli', 'perumallapalle', 'kalyani dam road', 'tirupati']
  },
  {
    id: 'vp-thondavada',
    name: 'Thondavada Village (Agastheeswara Temple)',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.6060,
    lng: 79.3360,
    type: 'village',
    keywords: ['thondavada', 'swarnamukhi', 'chandragiri']
  },
  {
    id: 'vp-ithepalle',
    name: 'Ithepalli Village',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.5870,
    lng: 79.2810,
    type: 'village',
    keywords: ['ithepalle', 'ithepalli', 'agarala road']
  },
  {
    id: 'vp-sanabatla',
    name: 'Sanabatla Village',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.5980,
    lng: 79.2710,
    type: 'village',
    keywords: ['sanabatla', 'sanabatla village', 'chandragiri']
  },
  {
    id: 'vp-mallavaram',
    name: 'Mallavaram Village',
    secondary: 'Renigunta Mandal, Tirupati District',
    lat: 13.6390,
    lng: 79.5220,
    type: 'village',
    keywords: ['mallavaram', 'mallavaram village', 'renigunta']
  },
  {
    id: 'vp-mangalam',
    name: 'Mangalam Village & Colony',
    secondary: 'Tirupati Urban, Andhra Pradesh',
    lat: 13.6450,
    lng: 79.4480,
    type: 'village',
    keywords: ['mangalam', 'mangalam cross', 'tirupati']
  },
  {
    id: 'vp-mundlapudi',
    name: 'Mundlapudi Village',
    secondary: 'Tirupati Rural, Andhra Pradesh',
    lat: 13.6040,
    lng: 79.3950,
    type: 'village',
    keywords: ['mundlapudi', 'mundlapudi village', 'tirupati rural']
  },
  {
    id: 'vp-vedullacheruvu',
    name: 'Vedullacheruvu Village',
    secondary: 'Renigunta Mandal, Tirupati District',
    lat: 13.6650,
    lng: 79.5300,
    type: 'village',
    keywords: ['vedullacheruvu', 'renigunta road']
  },
  {
    id: 'vp-settipalli',
    name: 'Settipalli Village',
    secondary: 'Tirupati Rural, Andhra Pradesh',
    lat: 13.6380,
    lng: 79.4620,
    type: 'village',
    keywords: ['settipalli', 'tirupati airport road']
  },
  {
    id: 'vp-paipalli',
    name: 'Paipalli Village',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.5700,
    lng: 79.2850,
    type: 'village',
    keywords: ['paipalli', 'pypalli', 'chandragiri rural']
  },
  {
    id: 'vp-kotala',
    name: 'Kotala Village & Railway Gate',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.5650,
    lng: 79.3080,
    type: 'village',
    keywords: ['kotala', 'kotala village', 'railway gate']
  },
  {
    id: 'vp-mittapalem',
    name: 'Mittapalem Village',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.5450,
    lng: 79.2800,
    type: 'village',
    keywords: ['mittapalem', 'mittapalem village']
  },
  {
    id: 'vp-damalcheruvu',
    name: 'Damalcheruvu Mango Market & Village',
    secondary: 'Pakala Mandal, Tirupati District',
    lat: 13.4850,
    lng: 79.1620,
    type: 'village',
    keywords: ['damalcheruvu', 'damalcheruvu market', 'pakala']
  },
  {
    id: 'vp-pulicherla',
    name: 'Pulicherla (Hamsavaram) Mandal',
    secondary: 'Chittoor-Tirupati District Border',
    lat: 13.5410,
    lng: 79.0720,
    type: 'village',
    keywords: ['pulicherla', 'hamsavaram', 'mandal']
  },
  {
    id: 'vp-kalluru',
    name: 'Kalluru Village & RTC Junction',
    secondary: 'Pulicherla Mandal, Andhra Pradesh',
    lat: 13.5650,
    lng: 79.0350,
    type: 'village',
    keywords: ['kalluru', 'kallur', 'pulicherla']
  },
  {
    id: 'vp-chinnagottigallu',
    name: 'Chinnagottigallu Village',
    secondary: 'Tirupati District, Andhra Pradesh',
    lat: 13.6700,
    lng: 79.1400,
    type: 'village',
    keywords: ['chinnagottigallu', 'gottigallu', 'bakarapet road']
  },
  {
    id: 'vp-rompichedla',
    name: 'Rompichedla Village',
    secondary: 'Pileru Route, Andhra Pradesh',
    lat: 13.7120,
    lng: 79.0850,
    type: 'village',
    keywords: ['rompichedla', 'pileru route']
  },
  {
    id: 'vp-bodavandlapalli',
    name: 'Bodavandlapalli Village',
    secondary: 'Pileru Mandal, Andhra Pradesh',
    lat: 13.6950,
    lng: 78.9600,
    type: 'village',
    keywords: ['bodavandlapalli', 'pileru rural']
  },
  {
    id: 'vp-gadanki',
    name: 'Gadanki Village (NARL Radar Facility)',
    secondary: 'Pakala Mandal, Tirupati District',
    lat: 13.4750,
    lng: 79.1850,
    type: 'village',
    keywords: ['gadanki', 'narl', 'radar', 'pakala']
  },
  {
    id: 'vp-gorantla',
    name: 'Gorantla Village',
    secondary: 'Pakala Mandal, Tirupati District',
    lat: 13.4420,
    lng: 79.1550,
    type: 'village',
    keywords: ['gorantla', 'pakala route']
  },
  {
    id: 'vp-irala',
    name: 'Irala Village & Mandal',
    secondary: 'Chittoor District, Andhra Pradesh',
    lat: 13.3650,
    lng: 79.0200,
    type: 'village',
    keywords: ['irala', 'irala mandal', 'chittoor']
  },
  {
    id: 'vp-penumuru',
    name: 'Penumuru Town & Mandal',
    secondary: 'Chittoor District, Andhra Pradesh',
    lat: 13.3750,
    lng: 79.1950,
    type: 'village',
    keywords: ['penumuru', 'penumur', 'chittoor']
  },
  {
    id: 'vp-vepagunta',
    name: 'Vepagunta Village',
    secondary: 'Puttur-Tirupati Route, Andhra Pradesh',
    lat: 13.4150,
    lng: 79.5250,
    type: 'village',
    keywords: ['vepagunta', 'puttur route']
  },
  {
    id: 'vp-karvetinagaram',
    name: 'Karvetinagaram Heritage Town',
    secondary: 'Chittoor District, Andhra Pradesh',
    lat: 13.4210,
    lng: 79.4490,
    type: 'village',
    keywords: ['karvetinagaram', 'venugopala swamy', 'puttur']
  },
  {
    id: 'vp-nagari',
    name: 'Nagari RTC Bus Stand & Town',
    secondary: 'Chittoor District, Andhra Pradesh',
    lat: 13.3250,
    lng: 79.5880,
    type: 'village',
    keywords: ['nagari', 'nagari hills', 'bus stand']
  },
  {
    id: 'vp-kuchivaripalli',
    name: 'Kuchivaripalli Village',
    secondary: 'Chandragiri Mandal, Tirupati',
    lat: 13.6150,
    lng: 79.2780,
    type: 'village',
    keywords: ['kuchivaripalli', 'chandragiri']
  },
  {
    id: 'vp-kothapalli',
    name: 'Kothapalli Village',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.6300,
    lng: 79.2880,
    type: 'village',
    keywords: ['kothapalli', 'chandragiri']
  },
  {
    id: 'vp-gollapalli',
    name: 'Gollapalli Village',
    secondary: 'Chandragiri Mandal, Tirupati District',
    lat: 13.6420,
    lng: 79.3200,
    type: 'village',
    keywords: ['gollapalli', 'chandragiri']
  },
  {
    id: 'vp-reddivaripalli',
    name: 'Reddivaripalli Village',
    secondary: 'Pakala Route, Andhra Pradesh',
    lat: 13.5950,
    lng: 79.2450,
    type: 'village',
    keywords: ['reddivaripalli', 'pakala route']
  },
  {
    id: 'vp-nadavaluru',
    name: 'Nadavaluru Village',
    secondary: 'Chandragiri-Pakala Road, Andhra Pradesh',
    lat: 13.6350,
    lng: 79.2450,
    type: 'village',
    keywords: ['nadavaluru', 'chandragiri']
  },
  {
    id: 'vp-kothabyle',
    name: 'Kothabyle Village',
    secondary: 'Chinnagottigallu Mandal, Tirupati',
    lat: 13.6550,
    lng: 79.1650,
    type: 'village',
    keywords: ['kothabyle', 'bakarapet']
  },
  {
    id: 'vp-kalyani-dam',
    name: 'Kalyani Dam Reservoir & View Point',
    secondary: 'Rangampeta Road, Tirupati Rural',
    lat: 13.6550,
    lng: 79.2850,
    type: 'landmark',
    keywords: ['kalyani dam', 'dam', 'reservoir', 'tirupati']
  },
  {
    id: 'vp-kapilatheertham',
    name: 'Kapilatheertham Temple & Circle',
    secondary: 'Alipiri Bypass Road, Tirupati',
    lat: 13.6490,
    lng: 79.4230,
    type: 'landmark',
    keywords: ['kapilatheertham', 'kapila theertham', 'temple', 'tirupati']
  },
  {
    id: 'vp-annamaiah-circle',
    name: 'Annamaiah Circle',
    secondary: 'Air Bypass Road, Tirupati',
    lat: 13.6280,
    lng: 79.4120,
    type: 'transit_hub',
    keywords: ['annamaiah circle', 'air bypass road', 'tirupati']
  },
  {
    id: 'vp-leela-mahal',
    name: 'Leela Mahal Circle',
    secondary: 'KT Road, Tirupati',
    lat: 13.6370,
    lng: 79.4240,
    type: 'transit_hub',
    keywords: ['leela mahal', 'leelamahal circle', 'kt road', 'tirupati']
  },
  {
    id: 'vp-korlagunta',
    name: 'Korlagunta Junction',
    secondary: 'Maruthi Nagar, Tirupati',
    lat: 13.6350,
    lng: 79.4280,
    type: 'village',
    keywords: ['korlagunta', 'maruthi nagar', 'tirupati']
  },
  {
    id: 'vp-bhavani-nagar',
    name: 'Bhavani Nagar',
    secondary: 'Near Railway Station, Tirupati',
    lat: 13.6330,
    lng: 79.4120,
    type: 'village',
    keywords: ['bhavani nagar', 'tirupati']
  },
  {
    id: 'vp-padmavathipuram',
    name: 'Padmavathipuram',
    secondary: 'Tiruchanur Road, Tirupati',
    lat: 13.6210,
    lng: 79.4420,
    type: 'village',
    keywords: ['padmavathipuram', 'tiruchanur road']
  },
  {
    id: 'vp-gandhipuram',
    name: 'Gandhipuram Village',
    secondary: 'Renigunta Road, Tirupati',
    lat: 13.6320,
    lng: 79.4350,
    type: 'village',
    keywords: ['gandhipuram', 'renigunta road']
  },
  {
    id: 'vp-balaji-colony',
    name: 'Balaji Colony',
    secondary: 'SV University Road, Tirupati',
    lat: 13.6400,
    lng: 79.4200,
    type: 'village',
    keywords: ['balaji colony', 'svu road', 'tirupati']
  }
];

// Expand common Indian abbreviations to improve search matching
function expandQuery(q) {
  let cleaned = String(q || '').trim();
  const lower = cleaned.toLowerCase();

  const replacements = [
    { regex: /\bvemu\b/gi, replacement: 'Vemu Institute of Technology' },
    { regex: /\bvemut\b/gi, replacement: 'Vemu Institute of Technology' },
    { regex: /\bsv\b/gi, replacement: 'Sri Venkateswara' },
    { regex: /\bsvu\b/gi, replacement: 'Sri Venkateswara University' },
    { regex: /\bsvce\b/gi, replacement: 'SV College of Engineering' },
    { regex: /\brtc\b/gi, replacement: 'APSRTC Bus Stand' },
    { regex: /\bstn\b/gi, replacement: 'Railway Station' },
    { regex: /\brly\b/gi, replacement: 'Railway' },
    { regex: /\bclg\b/gi, replacement: 'College' },
    { regex: /\bcoll\b/gi, replacement: 'College' },
    { regex: /\buniv\b/gi, replacement: 'University' },
    { regex: /\bjunc\b/gi, replacement: 'Junction' },
  ];

  for (const rep of replacements) {
    if (rep.regex.test(cleaned)) {
      cleaned = cleaned.replace(rep.regex, rep.replacement);
    }
  }
  return cleaned;
}

export const kmDistance = (a, b) => {
  if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return null;
  const r = (x) => (x * Math.PI) / 180;
  const d = r(b.lat - a.lat);
  const e = r(b.lng - a.lng);
  return 12742 * Math.asin(Math.sqrt(Math.sin(d / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(e / 2) ** 2));
};

// Search locations with instant Google Maps-style autocomplete suggestions
export async function searchLocationSuggestions(query, options = {}) {
  const hasOriginBias = typeof options?.lat === 'number' && typeof options?.lng === 'number';
  const rawQuery = String(query || '').trim();
  const lowerQuery = rawQuery.toLowerCase();

  // If query is empty but origin bias is present (e.g. user focused on Via Point input):
  // Return the closest verified villages and transit stops starting from the origin!
  if (!rawQuery) {
    if (hasOriginBias) {
      return VERIFIED_PLACES
        .map((p) => {
          const d = kmDistance(p, { lat: options.lat, lng: options.lng }) || 999;
          return {
            id: p.id,
            name: p.name,
            secondary: `${d.toFixed(1)} km from Starting Point • ${p.secondary}`,
            lat: p.lat,
            lng: p.lng,
            type: p.type,
            source: 'verified',
            distKm: d,
          };
        })
        .filter((p) => p.distKm > 0.2) // exclude exact starting point
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, 8);
    }
    return [];
  }

  // 1. Check if user typed numeric coordinates: "lat, lng" (e.g. "13.6288, 79.4192")
  const coordMatch = rawQuery.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[3]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [{
        id: `coord-${lat}-${lng}`,
        name: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        secondary: 'Direct map position',
        lat,
        lng,
        type: 'coordinates',
        source: 'direct'
      }];
    }
  }

  // 2. Instant Match against verified regional Gazetteer, sorted by proximity to origin
  let localMatches = VERIFIED_PLACES.filter((p) => {
    if (p.name.toLowerCase().includes(lowerQuery)) return true;
    if (p.secondary.toLowerCase().includes(lowerQuery)) return true;
    return p.keywords.some((kw) => kw.includes(lowerQuery) || lowerQuery.includes(kw));
  }).map((p) => {
    const d = hasOriginBias ? kmDistance(p, { lat: options.lat, lng: options.lng }) : null;
    return {
      id: p.id,
      name: p.name,
      secondary: d !== null ? `${d.toFixed(1)} km from Starting Point • ${p.secondary}` : p.secondary,
      lat: p.lat,
      lng: p.lng,
      type: p.type,
      source: 'verified',
      distKm: d !== null ? d : 999,
    };
  });

  if (hasOriginBias) {
    localMatches.sort((a, b) => a.distKm - b.distKm);
  }

  // 3. Fast Online Autocomplete via Photon API (Elasticsearch OpenStreetMap)
  let onlineResults = [];
  try {
    const expanded = expandQuery(rawQuery);
    const centerLat = hasOriginBias ? options.lat : 13.6288;
    const centerLng = hasOriginBias ? options.lng : 79.4192;

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(expanded)}&lat=${centerLat}&lon=${centerLng}&limit=8`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        onlineResults = data.features.map((f, idx) => {
          const props = f.properties || {};
          const [lng, lat] = f.geometry.coordinates || [];
          const d = hasOriginBias ? kmDistance({ lat, lng }, { lat: options.lat, lng: options.lng }) : null;

          // Format secondary location text
          const locationParts = [
            props.street,
            props.district || props.suburb || props.county,
            props.city || props.town || props.village,
            props.state,
            props.country || 'India',
          ].filter(Boolean);

          const distancePrefix = d !== null ? `${d.toFixed(1)} km from Start • ` : '';

          return {
            id: `photon-${props.osm_id || idx}-${Date.now()}`,
            name: props.name || props.street || rawQuery,
            secondary: `${distancePrefix}${locationParts.slice(0, 3).join(', ') || 'India'}`,
            lat: Number(lat),
            lng: Number(lng),
            type: props.osm_value || props.type || 'place',
            source: 'photon',
            distKm: d !== null ? d : 999,
          };
        }).filter(item => item.lat && item.lng);

        if (hasOriginBias) {
          onlineResults.sort((a, b) => a.distKm - b.distKm);
        }
      }
    }
  } catch (err) {
    console.warn('Photon autocomplete query failed:', err.message);
  }

  // 4. Fallback to OpenStreetMap Nominatim if needed
  if (localMatches.length === 0 && onlineResults.length === 0) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(rawQuery)}&limit=5`;
      const res = await fetch(nomUrl, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const nomData = await res.json();
        if (nomData && nomData.length > 0) {
          onlineResults = nomData.map((d, idx) => ({
            id: `nom-${d.place_id || idx}`,
            name: d.name || d.display_name.split(',')[0],
            secondary: d.display_name.split(',').slice(1, 4).join(',').trim(),
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
            type: d.type || 'place',
            source: 'nominatim',
            distKm: 999,
          }));
        }
      }
    } catch (e) {
      console.warn('Nominatim fallback failed:', e.message);
    }
  }

  // 5. Merge and deduplicate by proximity / name
  const combined = [...localMatches, ...onlineResults];
  if (hasOriginBias) {
    combined.sort((a, b) => a.distKm - b.distKm);
  }

  const seen = new Set();
  const deduped = [];

  for (const item of combined) {
    const key = `${item.name.toLowerCase()}_${item.lat.toFixed(3)}_${item.lng.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped.slice(0, 8);
}

// Reverse geocode coordinate to friendly street / village name
export async function reverseGeocodeCoord(lat, lng) {
  // 1. Check if close to verified regional place (< 500m)
  for (const vp of VERIFIED_PLACES) {
    const d = kmDistance({ lat, lng }, vp);
    if (d !== null && d <= 0.45) {
      return {
        name: vp.name,
        secondary: vp.secondary,
        lat,
        lng,
      };
    }
  }

  // 2. Online reverse geocoding via Photon OpenStreetMap
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`);
    if (res.ok) {
      const data = await res.json();
      const p = data?.features?.[0]?.properties;
      if (p) {
        const placeName = p.name || p.street || p.village || p.hamlet || p.suburb || p.city || p.town;
        if (placeName) {
          const locParts = [
            p.village && p.village !== placeName ? `${p.village} Village` : null,
            p.county || p.district,
            p.state || 'Andhra Pradesh',
          ].filter(Boolean);

          return {
            name: p.osm_value === 'hamlet' || p.osm_value === 'village' ? `${placeName} Village` : placeName,
            secondary: locParts.slice(0, 2).join(', ') || 'Rural Transit Road',
            lat,
            lng,
          };
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // 3. Fallback: Identify nearest known village or road junction
  let closest = null;
  let minD = 999;
  for (const vp of VERIFIED_PLACES) {
    const d = kmDistance({ lat, lng }, vp);
    if (d !== null && d < minD) {
      minD = d;
      closest = vp;
    }
  }

  if (closest && minD <= 4.0) {
    return {
      name: `Rural Road near ${closest.name}`,
      secondary: `${minD.toFixed(1)} km from ${closest.name}`,
      lat,
      lng,
    };
  }

  return {
    name: `Village Road Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    secondary: 'Regional Road Corridor',
    lat,
    lng,
  };
}

// Calculate road driving route with alternatives using OSM routing engine (supports narrow village roads)
export async function computeDrivingRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return [];

  // Filter out any invalid or duplicate consecutive waypoints
  const cleaned = [];
  for (const wp of waypoints) {
    if (!wp || typeof wp.lat !== 'number' || typeof wp.lng !== 'number') continue;
    if (cleaned.length > 0) {
      const prev = cleaned[cleaned.length - 1];
      // Skip duplicate coordinates (< 50m apart)
      if (Math.abs(prev.lat - wp.lat) < 0.0005 && Math.abs(prev.lng - wp.lng) < 0.0005) {
        continue;
      }
    }
    cleaned.push(wp);
  }

  if (cleaned.length < 2) return [];

  const coordsStr = cleaned.map((p) => `${p.lng},${p.lat}`).join(';');
  const hasAlternatives = cleaned.length === 2;

  // Primary: routing.openstreetmap.de (routed-car with continue_straight=false for sharp village turns & narrow roads)
  const primaryUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&continue_straight=false${hasAlternatives ? '&alternatives=true' : ''}`;
  const fallbackUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&continue_straight=false${hasAlternatives ? '&alternatives=true' : ''}`;

  for (const url of [primaryUrl, fallbackUrl]) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          return data.routes.map((r, idx) => ({
            id: `route-${idx}`,
            label: idx === 0 ? 'Primary Route (Narrow Roads & Highways)' : `Alternative Route ${idx + 1}`,
            via: r.legs?.[0]?.summary ? `via ${r.legs[0].summary}` : idx === 0 ? 'Fastest Road Path' : 'Alternative Road',
            distanceKm: (r.distance / 1000).toFixed(1),
            durationMin: Math.round(r.duration / 60),
            coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          }));
        }
      }
    } catch (err) {
      console.warn(`Routing request failed for ${url}:`, err.message);
    }
  }

  // Segment-by-segment routing fallback if multi-point chain had an issue on a narrow connector
  if (cleaned.length > 2) {
    try {
      const combinedCoords = [];
      let totalDist = 0;
      let totalDur = 0;

      for (let i = 0; i < cleaned.length - 1; i++) {
        const segStr = `${cleaned[i].lng},${cleaned[i].lat};${cleaned[i+1].lng},${cleaned[i+1].lat}`;
        const segUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${segStr}?overview=full&geometries=geojson&continue_straight=false`;
        const res = await fetch(segUrl);
        if (res.ok) {
          const d = await res.json();
          if (d.code === 'Ok' && d.routes?.[0]) {
            totalDist += d.routes[0].distance;
            totalDur += d.routes[0].duration;
            const pts = d.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            if (combinedCoords.length > 0) pts.shift();
            combinedCoords.push(...pts);
            continue;
          }
        }
        combinedCoords.push([cleaned[i].lat, cleaned[i].lng], [cleaned[i+1].lat, cleaned[i+1].lng]);
      }

      if (combinedCoords.length > 1) {
        return [{
          id: 'route-segmented',
          label: 'Direct Village Transit Route',
          via: 'Connected Village Roads',
          distanceKm: (totalDist / 1000).toFixed(1),
          durationMin: Math.round(totalDur / 60) || 15,
          coordinates: combinedCoords,
        }];
      }
    } catch (e) {
      console.warn('Segmented routing fallback failed:', e);
    }
  }

  // Safe fallback: connect waypoints smoothly
  let totalKm = 0;
  for (let i = 0; i < cleaned.length - 1; i++) {
    const d = kmDistance(cleaned[i], cleaned[i + 1]);
    if (d) totalKm += d;
  }
  const estKm = (totalKm * 1.15).toFixed(1);
  const estMin = Math.max(Math.round((totalKm * 1.15) / 35 * 60), 5);

  return [{
    id: 'route-direct',
    label: 'Direct Transit Corridor',
    via: 'Direct Road Connection',
    distanceKm: estKm,
    durationMin: estMin,
    coordinates: cleaned.map((p) => [p.lat, p.lng]),
  }];
}
