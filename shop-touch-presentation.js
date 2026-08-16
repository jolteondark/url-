const byId=(id)=>document.getElementById(id);
let syncing=false;
let queued=false;
let lastSignature="";

function parseOption(option){
  const text=option?.textContent?.trim()??"";
  const parts=text.split(" / ").map((part)=>part.trim());
  const priceText=parts.find((part)=>/円$/.test(part))??"";
  const ownedText=parts.find((part)=>/^所持\s*/.test(part))??"";
  return {id:option?.value??"",label:parts[0]||option?.value||"ITEM",price:priceText,owned:ownedText.replace(/^所持\s*/,"")||"0"};
}

function ensureCatalog(){
  const select=byId("shop-item");
  const form=select?.closest(".shop-form");
  if(!select||!form)return null;
  let catalog=byId("shop-touch-catalog");
  if(!catalog){
    catalog=document.createElement("div");
    catalog.id="shop-touch-catalog";
    catalog.className="shop-touch-catalog";
    catalog.setAttribute("role","listbox");
    catalog.setAttribute("aria-label","商品一覧");
    form.before(catalog);
  }
  return catalog;
}

function catalogSignature(select){
  return JSON.stringify([select.value,select.disabled,[...select.options].map((option)=>[option.value,option.textContent,option.disabled])]);
}

function renderCatalog(){
  if(syncing)return;
  const select=byId("shop-item");
  const catalog=ensureCatalog();
  if(!select||!catalog)return;
  const signature=catalogSignature(select);
  if(signature===lastSignature)return;
  lastSignature=signature;
  const selected=select.value;
  const cards=[...select.options].map((option)=>{
    const item=parseOption(option);
    const button=document.createElement("button");
    button.type="button";
    button.className="shop-touch-item";
    button.dataset.itemId=item.id;
    button.setAttribute("role","option");
    const active=item.id===selected;
    button.classList.toggle("selected",active);
    button.setAttribute("aria-selected",active?"true":"false");
    button.disabled=select.disabled||option.disabled;
    const title=document.createElement("strong");title.textContent=item.label;
    const meta=document.createElement("span");meta.className="shop-touch-meta";
    const price=document.createElement("b");price.textContent=item.price||"価格情報なし";
    const owned=document.createElement("small");owned.textContent=`所持 ×${item.owned}`;
    meta.append(price,owned);button.append(title,meta);return button;
  });
  catalog.replaceChildren(...cards);
  select.closest(".item-field")?.classList.add("shop-native-select-fallback");
}

function adjustQuantity(delta){
  const input=byId("shop-quantity");
  if(!input||input.disabled)return;
  const min=Number(input.min||1),max=Number(input.max||99);
  input.value=String(Math.max(min,Math.min(max,Number(input.value||min)+delta)));
  input.dispatchEvent(new Event("input",{bubbles:true}));
  input.dispatchEvent(new Event("change",{bubbles:true}));
}

function ensureQuantityStepper(){
  const input=byId("shop-quantity"),field=input?.closest(".quantity-field");
  if(!input||!field||field.querySelector(".shop-qty-stepper"))return;
  const stepper=document.createElement("div");stepper.className="shop-qty-stepper";
  const minus=document.createElement("button");minus.type="button";minus.className="shop-qty-button";minus.textContent="−";minus.setAttribute("aria-label","数量を1減らす");
  const plus=document.createElement("button");plus.type="button";plus.className="shop-qty-button";plus.textContent="＋";plus.setAttribute("aria-label","数量を1増やす");
  input.parentElement?.insertBefore(stepper,input);stepper.append(minus,input,plus);
  minus.addEventListener("click",()=>adjustQuantity(-1));plus.addEventListener("click",()=>adjustQuantity(1));
}

function refresh(){queued=false;ensureQuantityStepper();renderCatalog()}
function scheduleRefresh(){if(queued)return;queued=true;requestAnimationFrame(refresh)}

document.addEventListener("click",(event)=>{
  const card=event.target.closest(".shop-touch-item[data-item-id]");
  if(!card)return;
  const select=byId("shop-item");
  if(!select||select.disabled)return;
  syncing=true;select.value=card.dataset.itemId;select.dispatchEvent(new Event("change",{bubbles:true}));syncing=false;
  lastSignature="";scheduleRefresh();
  card.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
});

byId("shop-item")?.addEventListener("change",()=>{lastSignature="";scheduleRefresh()});
const shopCard=byId("shop-card");
if(shopCard)new MutationObserver(()=>{lastSignature="";scheduleRefresh()}).observe(shopCard,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["hidden","disabled"]});
scheduleRefresh();
