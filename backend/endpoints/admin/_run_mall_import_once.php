<?php
// TEMPORARY one-off endpoint — deployed to run the same city/mall bulk
// import against production that was already run locally, then deleted.
// Not part of the app. super_admin-only.
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = [
    'Delhi' => [
        'DLF Mall of India', 'Select Citywalk', 'Ambience Mall', 'Pacific Mall',
        'The Great India Place', 'Shipra Mall', 'Vegas Mall', 'The Grand Venice Mall',
        'DLF Promenade', 'DLF Emporio', 'Gaur City Mall', 'DLF Avenue Saket',
    ],
    'Mumbai' => [
        'Phoenix Marketcity', 'High Street Phoenix', 'R-City Mall', 'Infiniti Mall',
        'Inorbit Mall', 'Oberoi Mall',
    ],
    'Thane' => ['Viviana Mall', 'Korum Mall', 'Metro Junction Mall'],
    'Navi Mumbai' => ['Seawoods Grand Central', 'Inorbit Mall'],
    'Bengaluru' => [
        'Phoenix Marketcity', 'Phoenix Mall of Asia', 'Orion Mall', 'Forum Rex Walk',
        'Nexus Koramangala', 'Mantri Square', 'UB City', 'Nexus Shantiniketan',
        'Nexus Whitefield', 'Royal Meenakshi Mall', 'Bhartiya Mall of Bengaluru',
    ],
    'Hyderabad' => [
        'Sarath City Capital Mall', 'Inorbit Mall', 'GVK One', 'Nexus Hyderabad',
        'Next Galleria', 'LuLu Mall', 'Aparna Neo Mall', 'GSM Mall', 'DSL Virtue Mall',
    ],
    'Chennai' => [
        'Phoenix Marketcity', 'Express Avenue', 'Nexus Vijaya Mall', 'VR Chennai',
        'Marina Mall', 'Grand Square', 'Palladium', 'Ampa Skyone',
    ],
    'Pune' => [
        'Phoenix Marketcity', 'Phoenix Mall of the Millennium', 'Amanora Mall',
        'Seasons Mall', 'The Pavilion', 'Westend Mall', 'KOPA Mall', 'Kumar Pacific Mall',
    ],
    'Kolkata' => [
        'South City Mall', 'Quest Mall', 'Mani Square', 'City Centre', 'Acropolis Mall',
        'Avani Riverside Mall', 'Diamond Plaza', 'Metropolis Mall',
    ],
    'Ahmedabad' => [
        'Nexus Ahmedabad One', 'Palladium Ahmedabad', 'Gulmohar Park Mall',
        'Iscon Mega Mall', 'TRP Mall', 'The Acropolis',
    ],
    'Chandigarh' => ['Nexus Elante', 'Cosmo Mall'],
    'Mohali' => ['Bestech Square Mall', 'CP67 Mall'],
    'Zirakpur' => ['Nexus Celebration', 'Paras Downtown Square'],
    'Lucknow' => [
        'Lulu Mall', 'Phoenix Palassio', 'Phoenix United', 'Saharaganj Mall',
        'Fun Republic', 'One Awadh Center', 'Wave Mall', 'Singapore Mall',
    ],
    'Jaipur' => ['World Trade Park', 'Pink Square Mall', 'Triton Mall', 'MGF Metropolitan Mall', 'Elements Mall', 'GT Central Mall'],
    'Indore' => ['Phoenix Citadel', 'Treasure Island', 'C21 Mall', 'Malhar Mega Mall', 'Nexus Indore Central'],
    'Ludhiana' => ['MBD Neopolis', 'Pavilion Mall', 'Silver Arc Mall', 'Grand Walk'],
    'Amritsar' => ['Nexus Amritsar', 'Mall of Amritsar', 'Trilium Mall', 'Celebration Mall'],
    'Dehradun' => ['Pacific Mall', 'Mall of Dehradun', 'Centrio Mall', 'Crossroads Mall'],
    'Agra' => ['TDI Mall', 'Ashok Cosmos Mall', 'Cosmos Mall', 'Parsvnath Plaza'],
    'Varanasi' => ['JHV Mall', 'IP Sigra', 'PDR Mall', 'IP Vijaya Mall', 'Kuber Complex'],
    'Kanpur' => ['Z Square Mall', 'Rave 3', 'Rave @ Moti', 'South X Mall'],
    'Prayagraj' => ['Vinayak City Centre', 'Atlantis Mall', 'PVS Mall'],
    'Ajmer' => ['Mittal Mall', 'Miraj Mall', 'Cine Mall'],
    'Bikaner' => ['Bioscope Mall', 'Ashapurna Mall'],
    'Surat' => ['VR Surat', 'Rahul Raj Mall', 'Iscon Mall', 'Rajhans Multiplex Mall', 'Imperial Square', 'Virtuous Retail'],
    'Nagpur' => ['VR Nagpur', 'Nagpur Central Mall', 'Fortune Mall', 'Trillium Mall', 'Eternity Mall', 'Poonam Mall'],
    'Vadodara' => ['Inorbit Mall', 'Seven Seas Mall', 'Eva Mall', 'Center Square Mall', 'Bansal Mall'],
    'Nashik' => ['City Centre Mall', 'Pinnacle Mall'],
    'Chhatrapati Sambhaji Nagar' => ['Prozone Mall'],
    'Rajkot' => ['Crystal Mall', 'Reliance Mall', 'Cosmo Complex'],
    'Panaji' => ['Mall De Goa', 'Caculo Mall'],
    'Margao' => ['Osia Commercial Arcade'],
    'Kochi' => ['Lulu International Shopping Mall', 'Forum Mall Kochi', 'Centre Square Mall', 'Oberon Mall'],
    'Coimbatore' => ['Brookefields Mall', 'Prozone Mall', 'Fun Republic Mall', 'Broadway Megaplex'],
    'Visakhapatnam' => ['CMR Central', 'Inorbit Mall', 'V-Square', 'Chitralaya Mall'],
    'Vijayawada' => ['PVP Square', 'Trendset Mall', 'LEPL Centro', 'PVR Ripples'],
    'Mysuru' => ['Nexus Centre City', 'Mall of Mysore', 'Forum Mall', 'BM Habitat Mall'],
    'Mangaluru' => ['City Centre Mall', 'Fiza by Nexus', 'Bharath Mall', 'Lotus Mall'],
    'Thiruvananthapuram' => ['Lulu Mall', 'Mall of Travancore', 'Taurus Downtown'],
    'Kozhikode' => ['HiLite Mall', 'Lulu Mall Kozhikode', 'Gokulam Galleria', 'Focus Mall'],
    'Madurai' => ["Vishaal De Mall", "Milan'em Mall"],
    'Thrissur' => ['Sobha City Mall', 'Selex Mall', 'Y Mall'],
    'Kollam' => ['RP Mall', 'Bishop Jerome Nagar'],
    'Kannur' => ['Secura Centre', 'Capitol Mall', 'Thana Mall'],
    'Hubli-Dharwad' => ['Urban Oasis Mall', 'Galaxy Mall', 'Centrum Mall', 'U Mall'],
    'Belagavi' => ['Nexus Nucleus Mall', 'Millennium Mall'],
    'Bhubaneswar' => ['Nexus Esplanade', 'DN Regalia', 'Utkal Kanika Galleria', 'Symphony Mall', 'Forum Mart'],
    'Cuttack' => ['Netaji Subhash Chandra Bose Arcade', 'SGBL Square Mall'],
    'Guwahati' => ['City Centre', 'Central Mall', 'Aurus Mall', 'Hub Mall', 'Roodraksh Mall'],
    'Patna' => ['P&M Mall', 'City Centre Mall', 'Vasundhara Metro Mall'],
    'Raipur' => ['Magneto The Mall', 'Ambuja City Centre', 'City Mall 36', 'Colors Mall'],
    'Bhopal' => ['DB City Mall', 'Aura Mall', 'Ashima Mall', 'Aashima The Lake City Mall'],
    'Ranchi' => ['Nucleus Mall', 'Mall of Ranchi', 'JD Hi Street', 'Spring City Mall'],
    'Jamshedpur' => ['P&M Hi-Tech City Centre'],
    'Gwalior' => ['DB City Mall', 'Deen Dayal City Mall'],
    'Jabalpur' => ['South Avenue Mall', 'Samdariya Mall'],
    'Siliguri' => ['City Centre Siliguri', 'Vega Circle Mall', 'Cosmos Mall'],
    'Rourkela' => ['Forum Galleria Mall'],
    'Jammu' => ['Wave Mall'],
    'Srinagar' => ['City Centre Mall'],
    'Meerut' => ['Shopprix Mall', 'Era Mall', 'Melange Mall'],
    'Gorakhpur' => ['City Mall', 'AD Mall', 'Orion Mall'],
    'Rohtak' => ['Merion Sky'],
    'Udaipur' => ['Nexus Celebration', 'Urban Square Mall'],
    'Jodhpur' => ['MGI', 'Blue City Mall'],
    'Kota' => ['City Mall', 'Ahluwalia The Great Mall'],
    'Bareilly' => ['Phoenix United Mall'],
    'Aligarh' => ['Landmark Mall', 'Great Value Mall'],
    'Moradabad' => ['Parsvnath Mall', 'Cross River'],
    'Panipat' => ['Mittals Mega Mall'],
    'Karnal' => ['Super Mall', 'Alpha International City'],
    'Shimla' => ['Victory Tunnel'],
    'Haridwar' => ['Pentagon Mall'],
    'Bathinda' => ["Mittal's City Mall"],
    'Jhansi' => ['City Life Mall', 'Shrinath Mall'],
    'Mathura' => ['Highway Plaza'],
    'Solapur' => ['Oasis Mall'],
    'Kolhapur' => ['DYP City Mall'],
    'Gandhidham' => ['Kandla Shopping Mall'],
    'Jamnagar' => ['Crystal Mall'],
    'Bhavnagar' => ['Himalaya Mall'],
    'Anand' => ['Bapa Sitaram Mall'],
    'Vapi' => ['Empress Mall'],
    'Nanded' => ['Promenade Mall'],
    'Jalgaon' => ['Khandesh Central Mall'],
    'Bharuch' => ['ABC Circle Malls'],
    'Navsari' => ['Laxmi Square'],
    'Salem' => ['Reliance Mall', 'Nirmal Sky Win'],
    'Tirupur' => ['Velocity Mall'],
    'Warangal' => ['SR Shopping Mall'],
    'Guntur' => ['LEPL Icon Mall'],
    'Vellore' => ['Velocity Mall'],
    'Pondicherry' => ['Providence Mall'],
    'Tirupati' => ['K-Mall', 'Minerva Grand Mall'],
    'Udupi' => ['Canara Mall', 'City Centre Udupi'],
    'Erode' => ['Annamalai Mall'],
    'Nizamabad' => ['Vinayak Mall'],
    'Karimnagar' => ['R-Square Mall'],
    'Dindigul' => ['Vasantham Mall'],
    'Asansol' => ['Sentrum Mall', 'Galaxy Mall'],
    'Durgapur' => ['Junction Mall', 'Suhatta Mall'],
    'Gaya' => ['AP Colony Mall'],
    'Muzaffarpur' => ['Grand Mall', 'DRB Mall'],
    'Dibrugarh' => ['Junction Mall'],
    'Imphal' => ['Greater Shopping Complex'],
    'Shillong' => ["Glory's Plaza"],
    'Agartala' => ['ML Plaza'],
    'Dhanbad' => ['Ozone Galleria Mall'],
    'Bokaro' => ['Bokaro Mall'],
    'Haldia' => ['City Centre Haldia'],
    'Ujjain' => ['Treasure Bazaar'],
    'Bhilai' => ['Surya Treasure Island Mall'],
    'Bilaspur' => ['Rama Magneto Mall', 'City Mall 36'],
    'Sagar' => ['Omaxe Mall'],
    'Korba' => ['Palm Mall'],
    'Ratlam' => ['City Centre'],
    'Satna' => ['Utsav Square'],
    'Rewa' => ['Venkatesh Mall'],
];

$pdo = gmls_db();
$cityCount = 0;
$mallCount = 0;
$skipped = 0;

foreach ($data as $cityName => $malls) {
    $stmt = $pdo->prepare('SELECT id FROM cities WHERE name = ?');
    $stmt->execute([$cityName]);
    if (!$stmt->fetch()) {
        $pdo->prepare('INSERT INTO cities (name) VALUES (?)')->execute([$cityName]);
        $cityCount++;
    }

    foreach ($malls as $mallName) {
        $stmt = $pdo->prepare('SELECT id FROM malls WHERE name = ? AND city = ?');
        $stmt->execute([$mallName, $cityName]);
        if ($stmt->fetch()) {
            $skipped++;
            continue;
        }
        $pdo->prepare("INSERT INTO malls (name, city, status) VALUES (?, ?, 'approved')")
            ->execute([$mallName, $cityName]);
        $mallCount++;
    }
}

json_ok(['cities_added' => $cityCount, 'malls_added' => $mallCount, 'malls_skipped' => $skipped]);
