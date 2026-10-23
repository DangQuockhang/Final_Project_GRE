export function normalizeCollectionName(value){
 const name=String(value??'').trim().replace(/\s+/g,' ').toLowerCase();
 return name.charAt(0).toUpperCase()+name.slice(1);
}
export function collectionSuggestions(collections,category,input){
 const prefix=normalizeCollectionName(input).toLowerCase();
 return collections.filter(c=>c.category===category&&c.name.toLowerCase().startsWith(prefix))
  .sort((a,b)=>a.name.localeCompare(b.name)).slice(0,12);
}
export function groupCollections(collections){
 return ['accessories','bags','clothing','shoes'].map(category=>({
  category,name:normalizeCollectionName(category),
  items:collections.filter(c=>c.category===category&&!c.hidden&&Number(c.active_count)>0)
   .sort((a,b)=>a.name.localeCompare(b.name))
 })).filter(group=>group.items.length);
}
