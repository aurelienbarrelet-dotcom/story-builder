import { MAX_IMAGE_SIZE } from "../../core/config.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getStory } from "../../core/store.js";
import { readFileAsDataUrl } from "../../core/utils.js";

export function getMeta() { return getStory()?.meta ?? null; }
export function updateMetaField(field, value) { const meta=getMeta(); if(!meta)return; if(field.startsWith("footer.")) meta.footer[field.split(".")[1]]=value; else meta[field]=value; commitProjectChange(); }
export function updateAuthor(index, field, value) { const meta=getMeta(); if(!meta?.authors[index])return; meta.authors[index][field]=value; commitProjectChange(); }
export function addAuthor() { const meta=getMeta(); if(!meta)return; meta.authors.push({name:"",url:"",image:null,imageName:""}); commitProjectChange(); }
export function removeAuthor(index) { const meta=getMeta(); if(!meta)return; meta.authors.splice(index,1); if(!meta.authors.length) addAuthor(); else commitProjectChange(); }
async function readImage(file) { if(!file?.type.startsWith("image/")) throw new Error("Choisis un fichier image."); if(file.size>MAX_IMAGE_SIZE) throw new Error("Cette image dépasse 2,5 Mo."); return readFileAsDataUrl(file); }
export async function importAuthorImage(index,file) { const meta=getMeta(); if(!meta?.authors[index])return; meta.authors[index].image=await readImage(file); meta.authors[index].imageName=file.name; commitProjectChange(); }
export function removeAuthorImage(index) { const meta=getMeta(); if(!meta?.authors[index])return; meta.authors[index].image=null; meta.authors[index].imageName=""; commitProjectChange(); }
