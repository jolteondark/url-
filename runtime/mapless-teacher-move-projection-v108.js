import { MAPLESS_V108_MOVE_IDS as M } from "./generated/mapless-v108-teacher-moves/moves.js";
import { MAPLESS_V108_FORM_TEACHER_OVERRIDES as F } from "./generated/mapless-v108-teacher-moves/forms.js";
import B0 from "./generated/mapless-v108-teacher-moves/base-00.js";
import B1 from "./generated/mapless-v108-teacher-moves/base-01.js";
import B2 from "./generated/mapless-v108-teacher-moves/base-02.js";
import B3 from "./generated/mapless-v108-teacher-moves/base-03.js";
import B4 from "./generated/mapless-v108-teacher-moves/base-04.js";
import B5 from "./generated/mapless-v108-teacher-moves/base-05.js";
import B6 from "./generated/mapless-v108-teacher-moves/base-06.js";
import B7 from "./generated/mapless-v108-teacher-moves/base-07.js";
import B8 from "./generated/mapless-v108-teacher-moves/base-08.js";
import B9 from "./generated/mapless-v108-teacher-moves/base-09.js";
import B10 from "./generated/mapless-v108-teacher-moves/base-10.js";
import B11 from "./generated/mapless-v108-teacher-moves/base-11.js";

const B=[...B0,...B1,...B2,...B3,...B4,...B5,...B6,...B7,...B8,...B9,...B10,...B11];
const MD=new Map(M.map((x,i)=>[i,x]));
const BM=new Map(B.map(([s,e,t])=>[s,{e,t}]));
const FM=new Map(F.map(([s,f,e,t])=>[`${s},${f}`,{e,t}]));
function dec(s){if(s==null)return null;if(!s)return[];return s.split('.').map(x=>MD.get(parseInt(x,36)));}
function kindKey(kind){const value=String(kind??'').toLowerCase();if(value==='egg')return'e';if(value==='tutor')return't';throw new TypeError('teacher kind must be egg or tutor');}
export function projectCanonicalTeacherMovesV108(pokemon,kind){if(!pokemon||typeof pokemon!=='object')return[];const species=String(pokemon.species??'').toUpperCase();if(!species)return[];const parsed=Number(pokemon.form??0);const form=Number.isInteger(parsed)&&parsed>=0?parsed:0;const key=kindKey(kind);const base=BM.get(species)?.[key]??'';const override=FM.get(`${species},${form}`);const effective=override&&override[key]!==null&&override[key]!==undefined?override[key]:base;return dec(effective)??[];}
export const MAPLESS_V108_TEACHER_PROJECTION_COUNTS=Object.freeze({species:898,form_overrides:55,machine_moves_excluded:100});
