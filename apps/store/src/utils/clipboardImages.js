// Clipboard/drag-and-drop images use the same validation as file pickers.
// Clipboard paste is deliberately event-driven: no background readClipboard
// permissions and no support for untrusted remote image URLs.
export const ALLOWED_IMAGE_TYPES=Object.freeze(['image/jpeg','image/png','image/webp']);
export const MAX_UPLOAD_IMAGE_BYTES=3*1024*1024;

export function imageFilesFromClipboard(clipboard){
 const items=Array.from(clipboard?.items||[]);
 const fileItems=items.filter(item=>item.kind==='file'&&item.type?.startsWith('image/'));
 const files=fileItems.map(item=>item.getAsFile?.()).filter(Boolean);
 if(files.length)return files;
 return Array.from(clipboard?.files||[]).filter(file=>file.type?.startsWith('image/'));
}
export function validateImageFiles(files,{maxCount=1,maxBytes=MAX_UPLOAD_IMAGE_BYTES}={}){
 const selected=Array.from(files||[]);
 if(!selected.length)return 'No image found. Choose Copy image (not Copy image address), then paste.';
 if(selected.length>maxCount)return 'Only '+maxCount+' image(s) can be selected at once.';
 if(selected.some(file=>!ALLOWED_IMAGE_TYPES.includes(file.type)))
  return 'Only JPG, PNG and WebP images are supported.';
 if(selected.some(file=>!file.size||file.size>maxBytes))
  return 'Each image must be under 3 MB and contain image data.';
 return '';
}
export function appendImages(current,incoming,{maxCount=6}={}){
 const selected=Array.from(current||[]).concat(Array.from(incoming||[]));
 const issue=validateImageFiles(selected,{maxCount});
 if(issue)return {files:current,error:issue};
 return {files:selected,error:''};
}
