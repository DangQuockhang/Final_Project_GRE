// Photo order remains explicit: browser FileList order does not necessarily
// match the order in which Ctrl-click multi-selection was performed.
export function moveItem(items,index,direction){
 const list=Array.from(items||[]);
 const next=index+direction;
 if(index<0||index>=list.length||next<0||next>=list.length)return list;
 [list[index],list[next]]=[list[next],list[index]];
 return list;
}
export function galleryInOrder(images=[],imageIds=[]){
 const byId=new Map((images||[]).map(image=>[String(image.id),image]));
 const arranged=imageIds.map(id=>byId.get(String(id))).filter(Boolean);
 const included=new Set(arranged.map(image=>String(image.id)));
 return [...arranged,...(images||[]).filter(image=>!included.has(String(image.id)))];
}
export function validateGalleryOrder(galleryIds,imageIds,coverId){
 if(!Array.isArray(imageIds)||imageIds.length>8||
 !imageIds.every(id=>Number.isSafeInteger(Number(id))&&Number(id)>0)||
 new Set(imageIds.map(String)).size!==imageIds.length)return false;
 if(new Set(galleryIds.map(String)).size!==imageIds.length)return false;
 const gallerySet=new Set(galleryIds.map(String));
 if(!imageIds.every(id=>gallerySet.has(String(id))))return false;
 if(coverId!=null&&!gallerySet.has(String(coverId)))return false;
 return true;
}
