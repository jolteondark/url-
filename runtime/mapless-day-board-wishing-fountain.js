import {resolveWishingFountain} from './mapless-wishing-fountain-flow.js';
import {resolveDayBoardNormalEventFlow} from './mapless-day-board-normal-event-flow.js';
export function resolveDayBoardWishingFountain(input={}){
 const boardInput=input.board||input;
 const probe=resolveDayBoardNormalEventFlow({...boardInput,open_result:false,normal_resolved_after_open:false,event_name:'願いの泉'});
 const event=(boardInput.board_events||[])[Number.parseInt(boardInput.index??0,10)]||null;
 const eligible=event?.kind==='normal_event'&&event?.normal_event_id==='wishing_fountain'&&probe.operations.some(x=>x.op==='open_normal_event');
 if(!eligible)return {fountain:null,board:probe,result:probe.result==='delegated'?'delegated':false};
 const fountain=resolveWishingFountain({...input.fountain,event});
 const board=resolveDayBoardNormalEventFlow({...boardInput,open_result:fountain.result===true,normal_resolved_after_open:fountain.event.normal_resolved===true,event_resolution:fountain,event_name:'願いの泉'});
 return {fountain,board,result:board.result};
}
