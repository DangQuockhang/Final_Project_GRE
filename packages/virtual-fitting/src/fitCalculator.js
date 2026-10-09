/** Rule-based chest-ease demonstration; NOT medical or production sizing advice. */
export const SIZE_CHART={XS:92,S:98,M:106,L:114,XL:122,XXL:130};
export function estimateFit(garmentChest,bodyChest){
 if(garmentChest===null||garmentChest===undefined||bodyChest===null||bodyChest===undefined||!Number.isFinite(Number(garmentChest))||!Number.isFinite(Number(bodyChest)))return {label:'Chưa có thông số',tone:'info',ease:null};
 const ease=Number(garmentChest)-Number(bodyChest);
 if(ease<5)return {label:'Có thể quá chật',tone:'bad',ease};
 if(ease<10)return {label:'Dáng ôm',tone:'warn',ease};
 if(ease<=18)return {label:'Thoải mái dự kiến',tone:'good',ease};
 return {label:'Dáng rộng',tone:'info',ease};
}
