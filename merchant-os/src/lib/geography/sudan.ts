/** Curated address suggestions, NOT administrative boundaries or delivery availability.
 * Sources and update policy: docs/SUDAN_LOCATION_DIRECTORY.md. IDs are append-only.
 */
export type SudanPlace = { readonly id: string; readonly name: string };
export type SudanState = SudanPlace & { readonly cities: readonly SudanPlace[] };
const cities = (items: readonly (readonly [string, string])[]): readonly SudanPlace[] =>
  items.map(([id, name]) => ({ id, name }));

export const SUDAN_DIRECTORY_VERSION = '2026-08-31';
export const SUDAN_STATES: readonly SudanState[] = [
  { id: 'red-sea', name: 'البحر الأحمر', cities: cities([
    ['port-sudan', 'بورتسودان'], ['suakin', 'سواكن'], ['sinkat', 'سنكات'], ['tokar', 'طوكر'], ['gebeit', 'جبيت'],
  ]) },
  { id: 'kassala', name: 'كسلا', cities: cities([
    ['kassala', 'كسلا'], ['new-halfa', 'حلفا الجديدة'], ['khashm-el-girba', 'خشم القربة'],
  ]) },
  { id: 'gedaref', name: 'القضارف', cities: cities([
    ['gedaref', 'القضارف'], ['fao', 'الفاو'], ['hawata', 'الحواتة'], ['shuwak', 'الشواك'],
  ]) },
  { id: 'river-nile', name: 'نهر النيل', cities: cities([
    ['atbara', 'عطبرة'], ['ad-damir', 'الدامر'], ['shendi', 'شندي'], ['berber', 'بربر'],
  ]) },
  { id: 'northern', name: 'الشمالية', cities: cities([
    ['dongola', 'دنقلا'], ['merowe', 'مروي'], ['karima', 'كريمة'], ['wadi-halfa', 'وادي حلفا'], ['ad-dabbah', 'الدبة'], ['argo', 'أرقو'],
  ]) },
  { id: 'khartoum', name: 'الخرطوم', cities: cities([
    ['khartoum', 'الخرطوم'], ['bahri', 'الخرطوم بحري'], ['omdurman', 'أم درمان'],
  ]) },
  { id: 'gezira', name: 'الجزيرة', cities: cities([
    ['wad-madani', 'ود مدني'], ['managil', 'المناقل'], ['hasahisa', 'الحصاحيصا'], ['rufaa', 'رفاعة'],
  ]) },
  { id: 'white-nile', name: 'النيل الأبيض', cities: cities([
    ['rabak', 'ربك'], ['kosti', 'كوستي'], ['ed-dueim', 'الدويم'], ['getaina', 'القطينة'], ['tandalti', 'تندلتي'], ['aba-island', 'الجزيرة أبا'],
  ]) },
  { id: 'blue-nile', name: 'النيل الأزرق', cities: cities([
    ['damazin', 'الدمازين'], ['roseires', 'الروصيرص'],
  ]) },
  { id: 'sennar', name: 'سنار', cities: cities([
    ['singa', 'سنجة'], ['sennar', 'سنار'], ['dinder', 'الدندر'], ['suki', 'السوكي'],
  ]) },
  { id: 'north-kordofan', name: 'شمال كردفان', cities: cities([
    ['el-obeid', 'الأبيض'], ['umm-ruwaba', 'أم روابة'], ['ar-rahad', 'الرهد'],
  ]) },
  { id: 'south-kordofan', name: 'جنوب كردفان', cities: cities([
    ['kadugli', 'كادقلي'], ['dilling', 'الدلنج'], ['abu-jubaiha', 'أبو جبيهة'],
  ]) },
  { id: 'west-kordofan', name: 'غرب كردفان', cities: cities([
    ['fula', 'الفولة'], ['muglad', 'المجلد'], ['babanusa', 'بابنوسة'], ['nahud', 'النهود'], ['ghubaish', 'غبيش'],
  ]) },
  { id: 'north-darfur', name: 'شمال دارفور', cities: cities([
    ['el-fasher', 'الفاشر'], ['kutum', 'كتم'], ['kabkabiya', 'كبكابية'], ['mellit', 'مليط'],
  ]) },
  { id: 'south-darfur', name: 'جنوب دارفور', cities: cities([
    ['nyala', 'نيالا'], ['kass', 'كاس'], ['buram', 'برام'], ['tulus', 'تلس'], ['rehaid-el-berdi', 'رهيد البردي'],
  ]) },
  { id: 'east-darfur', name: 'شرق دارفور', cities: cities([
    ['ed-daein', 'الضعين'], ['sheria', 'شعيرية'],
  ]) },
  { id: 'west-darfur', name: 'غرب دارفور', cities: cities([['geneina', 'الجنينة']]) },
  { id: 'central-darfur', name: 'وسط دارفور', cities: cities([['zalingei', 'زالنجي']]) },
];

// City-level groupings only: no guessed ward-to-ward hierarchy or coordinates.
export const SUDAN_DISTRICTS: Readonly<Record<string, readonly SudanPlace[]>> = {
  'port-sudan': cities([
    ['deim-arab', 'ديم عرب'], ['deim-al-nour', 'ديم النور'], ['deim-al-madina', 'ديم المدينة'],
    ['deim-suakin', 'ديم سواكن'], ['deim-jaber', 'ديم جابر'], ['deim-musa', 'ديم موسى'],
    ['deim-mayo', 'ديم مايو'], ['salalab-east', 'سلالاب شرق'], ['salalab-west', 'سلالاب غرب'],
    ['shagar', 'شقر'], ['al-wahda', 'الوحدة'], ['al-matar', 'المطار'], ['al-shati', 'الشاطئ'],
    ['transit', 'ترانزيت'], ['korea', 'كوريا'], ['dar-al-naeem', 'دار النعيم'], ['dar-al-salam', 'دار السلام'],
    ['al-riyadh', 'الرياض'], ['al-mirghaniya', 'الميرغنية'], ['al-janain', 'الجنائن'], ['al-inqaz', 'الإنقاذ'],
    ['al-azama', 'العظمة'], ['al-tagadum', 'التقدم'], ['al-aghariq', 'الأغاريق'],
    ['al-iskala', 'الأسكلة'], ['al-qadisiyah', 'القادسية'], ['umm-al-qura', 'أم القرى'],
    ['abu-hashish', 'أبو حشيش'], ['salbona', 'سلبونا'], ['deim-al-tijani', 'ديم التيجاني'],
  ]),
  kassala: cities([
    ['al-khatmiya', 'الختمية'], ['al-mirghaniya', 'الميرغنية'], ['al-halanga', 'الحلنقة'],
    ['halat-al-maqam', 'حلة المقام'], ['halat-karai', 'حلة كراي'], ['halat-salama-sidi', 'حلة سلامة سيدي'],
    ['halat-al-qawaza', 'حلة القوازة'], ['halat-al-darih', 'حلة الضريح'], ['halat-al-yamani', 'حلة اليماني'],
    ['al-rashid', 'الرشيد'], ['al-amiriya', 'العامرية'], ['al-souriba', 'السوريبا'],
    ['al-halanga-central', 'الحلنقة الوسط'], ['al-halanga-north', 'الحلنقة شمال'],
  ]),
  atbara: cities([
    ['al-dakhla', 'الداخلة'], ['al-soug', 'حي السوق'], ['al-hasaya', 'الحصايا'],
    ['east-extension', 'الامتداد الشرقي'], ['north-extension', 'الامتداد الشمالي'],
    ['ambikol', 'أمبكول'], ['al-murabaat', 'المربعات'], ['al-matar', 'المطار'],
    ['al-sayala', 'السيالة'], ['khalywa', 'خليوة'], ['railway', 'السكة حديد'], ['al-ummal', 'حي العمال'],
  ]),
  gedaref: cities([
    ['deim-al-nour', 'ديم النور'], ['al-nasr', 'النصر'], ['deim-hamad', 'ديم حمد'],
    ['al-midan', 'الميدان'], ['rowina', 'روينا'], ['al-jumhuriya', 'الجمهورية'],
    ['al-janain', 'الجنائن'], ['al-jabarab', 'الجباراب'], ['deim-bakr', 'ديم بكر'],
    ['al-nazir', 'حي الناظر'], ['al-asra', 'حي الأسرى'], ['al-sufi-al-azraq', 'الصوفي الأزرق'],
    ['salama-al-bey', 'سلامة البيه'], ['deim-suakin', 'ديم سواكن'], ['al-muwazafin', 'حي الموظفين'],
    ['abkar-jibril', 'أبكر جبريل'], ['al-danagla', 'حي الدناقلة'], ['abayo', 'أبايو'],
    ['halat-al-malik', 'حلة الملك'], ['assar', 'عصار'],
  ]),
  'wad-madani': cities([
    ['al-madaniyin', 'المدنيين'], ['al-qism-al-awal', 'القسم الأول'], ['al-sudani', 'الحي السوداني'],
    ['al-munira', 'المنيرة'], ['al-zamalek', 'الزمالك'], ['al-matar', 'المطار'], ['al-malakia', 'الملكية'],
    ['al-dabbagha', 'الدباغة'], ['jazirat-al-fil', 'جزيرة الفيل'], ['wad-azrag', 'ود أزرق'],
    ['bant', 'بانت'], ['hantoub', 'حنتوب'], ['al-mazad', 'المزاد'], ['dardaq', 'دردق'],
    ['shendi-fog', 'شندي فوق'], ['al-nishishiba', 'النشيشيبة'], ['al-daraja', 'الدرجة'],
    ['al-safa', 'الصفا'], ['al-thawra', 'الثورة'], ['al-bustan', 'البستان'],
    ['al-waha', 'الواحة'], ['marangan', 'مارنجان'], ['al-muwazafin', 'حي الموظفين'], ['mayo', 'مايو'],
  ]),
  khartoum: cities([
    ['al-amarat', 'العمارات'], ['al-riyadh', 'الرياض'], ['al-taif', 'الطائف'], ['arkawit', 'أركويت'],
    ['al-maamura', 'المعمورة'], ['al-sahafa', 'الصحافة'], ['al-sajana', 'السجانة'], ['burri', 'بري'],
    ['garden-city', 'جاردن سيتي'], ['khartoum-1', 'الخرطوم 1'], ['khartoum-2', 'الخرطوم 2'],
    ['khartoum-3', 'الخرطوم 3'], ['al-gereif-west', 'الجريف غرب'], ['nasir-extension', 'امتداد ناصر'],
    ['al-mujahideen', 'المجاهدين'], ['soba', 'سوبا'], ['al-azhari', 'الأزهري'], ['mayo', 'مايو'],
    ['al-salama', 'السلمة'], ['al-zuhur', 'الزهور'], ['al-deim', 'الديوم'], ['al-lamab', 'اللاماب'],
    ['al-goz', 'القوز'], ['al-rumaila', 'الرميلة'],
  ]),
};

export function getSudanCities(stateId: string): readonly SudanPlace[] {
  return SUDAN_STATES.find(state => state.id === stateId)?.cities ?? [];
}
export function getSudanDistricts(cityId: string): readonly SudanPlace[] {
  return Object.hasOwn(SUDAN_DISTRICTS, cityId) ? SUDAN_DISTRICTS[cityId] : [];
}

export type SudanSelection = { stateId: string; cityId: string; districtId: string };
export const EMPTY_SUDAN_SELECTION: SudanSelection = { stateId: '', cityId: '', districtId: '' };
export function changeSudanSelection(current: SudanSelection, field: keyof SudanSelection, value: string): SudanSelection {
  if (field === 'stateId') return { stateId: value, cityId: '', districtId: '' };
  if (field === 'cityId') return { ...current, cityId: value, districtId: '' };
  return { ...current, districtId: value };
}

/** Resolve labels on the server, never trust client-supplied labels for directory IDs.
 * Keep the existing city/name DB contract (no migration or rewriting historical areas).
 */
export function resolveCoverageLocation(input: Record<string, unknown>): { city: string | null; name: string } | null {
  const read = (key: string) => typeof input[key] === 'string' ? input[key].trim() : '';
  const name = read('name');
  const city = read('city');
  const mode = read('locationMode');
  const stateId = read('stateId');
  const cityId = read('cityId');
  const districtId = read('districtId');
  const validText = (s: string) => s.length >= 2 && s.length <= 120 && !/[\u0000-\u001f\u007f]/.test(s);
  // Compatibility with previously rendered forms, including non-Sudan partners.
  if (!mode && !stateId && !cityId && !districtId) {
    return validText(name) && (!city || validText(city)) ? { city: city || null, name } : null;
  }
  if (mode !== 'directory' || !SUDAN_STATES.some(state => state.id === stateId)) return null;
  if (cityId === 'custom') return !districtId && validText(city) && validText(name) ? { city, name } : null;
  const selectedCity = getSudanCities(stateId).find(item => item.id === cityId);
  if (!selectedCity) return null;
  if (!districtId) return validText(name) ? { city: selectedCity.name, name } : null;
  const district = getSudanDistricts(cityId).find(item => item.id === districtId);
  return district ? { city: selectedCity.name, name: district.name } : null;
}
