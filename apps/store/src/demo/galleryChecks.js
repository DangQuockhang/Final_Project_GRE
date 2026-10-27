export async function runGalleryChecks(){
 const wait=()=>new Promise(resolve=>setTimeout(resolve,120));
 const get=s=>{const el=document.querySelector(s);if(!el)throw Error('Missing '+s);return el;};
 const click=async s=>{get(s).click();await wait();};
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 try{
  await wait();
  const current=()=>get('.kd-v2-gallery-main img').getAttribute('src');
  assert(current().includes('look-0.svg'),'Cover must be first');
  await click('[aria-label="Oat"]');
  assert(current().includes('look-2.svg'),'Color must select its photo');
  await click('[aria-label="Next product image"]');
  assert(current().includes('look-3.svg'),'Next photo');
  await click('[aria-label="Show product photo 1"]');
  assert(current().includes('look-0.svg'),'Thumbnail navigation');
  await click('.kd-v2-gallery-main');
  assert(document.querySelector('[role="dialog"]'),'Viewer opens');
  await click('[aria-label="Zoom in"]');
  assert(get('.kd-v2-lightbox-tools').textContent.includes('125%'),'Zoom works');
  await click('[aria-label="View photo 3"]');
  assert(get('.kd-v2-lightbox-tools').textContent.includes('100%'),'Thumbnail resets zoom');
  await click('[aria-label="Close image viewer"]');
  assert(!document.querySelector('[role="dialog"]'),'Viewer closes');
  await click('.kd-demo-heading nav button:nth-child(2)');
  await click('[aria-label="Use existing photo 3 as cover"]');
  assert(current().includes('look-2.svg'),'Admin cover preview updates');
  get('.kd-quick-editor').requestSubmit();await wait();await wait();
  assert(current().includes('look-2.svg'),'Save preserves chosen cover');
  assert(document.querySelector('.kd-demo-product'),'Save returns to storefront');
  const status=document.createElement('output');status.id='gallery-check-result';status.textContent='GALLERY_CHECKS_PASSED';document.body.append(status);
 }catch(error){
  const status=document.createElement('output');status.id='gallery-check-result';status.textContent='GALLERY_CHECKS_FAILED: '+error.message;document.body.append(status);
 }
}
