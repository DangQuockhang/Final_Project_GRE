// Pure gallery logic shared by React carousel/lightbox and unit tests.
export const nextImage=(current,delta,count)=>count?((current+delta)%count+count)%count:0;
export function galleryUrls(product,resolve){
 const ordered=[product?.image_url,...(product?.images||[]).map(photo=>photo.image_url)];
 const urls=ordered.filter(Boolean).map(resolve).filter(Boolean);
 return [...new Set(urls)];
}
