// The editable DOM is never sent to the server. Only text and registered images are saved.
export function readDocument(root,images){
 const blocks=[];let text='',type='paragraph';
 const flush=()=>{if(text)blocks.push({type,text});text='';};
 function visit(node){
  if(node.nodeType===3){text+=node.textContent;return;}
  if(node.nodeType!==1)return;
  if(node.tagName==='IMG'){
   flush();const image=images.get(node.dataset.detailId);
   if(image)blocks.push({...image});return;
  }
  if(node.tagName==='BR'){text+='\n';return;}
  const boundary=/^(P|DIV|H[1-6]|LI|BLOCKQUOTE)$/.test(node.tagName);
  const previous=type;
  if(boundary){flush();type=/^H[1-6]$/.test(node.tagName)?'heading':'paragraph';}
  for(const child of node.childNodes)visit(child);
  if(boundary){flush();type=previous;}
 }
 for(const child of root.childNodes)visit(child);
 flush();return blocks;
}
