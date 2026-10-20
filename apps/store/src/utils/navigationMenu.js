// Shared outside-click predicate for popover menus.
// A user click/tap should dismiss an open menu only when it is outside both
// the active toggle button and the menu itself.
export function isOutsidePanel(target,trigger,panel){
 if(!target)return false;
 return !Boolean(trigger?.contains(target)||panel?.contains(target));
}
