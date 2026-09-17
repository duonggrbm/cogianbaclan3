
/* Xì Dách online - host is Cái, not a second player. */
const $ = id => document.getElementById(id);
let peer=null, hostPeerId="", roomCode="", me=null, isHost=false;
let conns=new Map(), state=null, myHand=[], dealerHand=[], deck=[];

const suits=["♠","♥","♦","♣"], ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
function makeDeck(){
  const d=[]; for(const s of suits) for(const r of ranks) d.push({s,r});
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}
  return d;
}
function val(hand){let total=0,aces=0;for(const c of hand){if(c.r==="A"){total+=11;aces++}else total+=/[JQK]/.test(c.r)?10:Number(c.r)}while(total>21&&aces){total-=10;aces--}return total}
function special(hand){
  const v=val(hand);
  if(hand.length===2&&hand.some(c=>c.r==="A")&&hand.some(c=>["10","J","Q","K"].includes(c.r)))return "Xì Dách";
  if(hand.length===2&&hand.every(c=>c.r==="A"))return "Xì Bàng";
  if(hand.length===5&&v<=21)return "Ngũ Linh";
  if(v>21)return "Quắc";
  return "";
}
function power(hand){const sp=special(hand);return sp==="Xì Bàng"?1000:sp==="Xì Dách"?900:sp==="Ngũ Linh"?800:val(hand)}

// Cân bằng lợi thế Cái: ưu tiên khoảng 70% thắng nhưng vẫn giữ cảm giác ngẫu nhiên
function dealerCard(){
  const winBias = Math.random() < 0.70;
  if(winBias){
    const good = deck.filter(c=>{
      const test = dealerHand.concat([c]);
      const v = val(test);
      return v>=16 && v<=21 && special(test)!=="Quắc";
    });
    if(good.length){
      const c=good[Math.floor(Math.random()*good.length)];
      deck.splice(deck.indexOf(c),1);
      return c;
    }
  }
  return deck.pop();
}
function dealDealerStart(){
  const winBias = Math.random() < 0.70;
  if(winBias){
    const goodPairs=[];
    for(let i=0;i<deck.length;i++) for(let j=i+1;j<deck.length;j++){
      const h=[deck[i],deck[j]];
      if(val(h)>=17 && val(h)<=21 && !special(h).includes("Quắc")) goodPairs.push(h);
    }
    if(goodPairs.length){
      const h=goodPairs[Math.floor(Math.random()*goodPairs.length)];
      deck.splice(deck.indexOf(h[0]),1);
      deck.splice(deck.indexOf(h[1]),1);
      return h;
    }
  }
  return [deck.pop(),deck.pop()];
}

function face(c){return `<div class="cardface ${["♥","♦"].includes(c.s)?"red":""}"><span>${c.r}</span><span>${c.s}</span></div>`}
function backs(n){return Array.from({length:n},()=>'<div class="cardface back">🂠</div>').join("")}
function send(c,msg){try{if(c&&c.open)c.send(msg)}catch(e){}}
function broadcast(msg){for(const c of conns.values())send(c,msg)}
function publicState(){return {room:roomCode,phase:state.phase,turnIndex:state.turnIndex||0,players:state.players.map(p=>({id:p.id,name:p.name,role:p.role,done:!!p.done})),dealerDone:!!state.dealerDone,results:state.results||null}}
function sync(){if(isHost)broadcast({t:"state",state:publicState()});render()}
function setStatus(x){$("gameStatus").textContent=x}

function setupPeer(id,onopen){
  peer=new Peer(id,{debug:0,config:{iceServers:[
    {urls:"stun:stun.l.google.com:19302"},
    {urls:"stun:stun1.l.google.com:19302"}
  ]}});
  peer.on("open",pid=>{if(isHost)hostPeerId=pid;onopen(pid)});
  peer.on("error",e=>{console.error(e);setStatus("Kết nối lỗi: "+(e.type||"không xác định")+". Hãy tải lại trang và thử lại.")});
  peer.on("disconnected",()=>setStatus("Kết nối máy chủ tín hiệu bị gián đoạn. Đang thử kết nối lại…"));
  peer.on("close",()=>setStatus("Kết nối đã đóng."));
  peer.on("connection",c=>{if(isHost)accept(c)});
}
function createRoom(){
  const password=prompt("Nhập mật khẩu tạo phòng:");
  if(password!=="1235"){
    alert("Sai mật khẩu. Không thể tạo phòng.");
    return;
  }
  const name=$("nameInput").value.trim()||"Chủ phòng";
  roomCode=Math.random().toString(36).slice(2,8).toUpperCase(); isHost=true;
  me={id:crypto.randomUUID(),name,role:"Cái",done:false};
  const id="xd-"+roomCode.toLowerCase()+"-"+Math.random().toString(36).slice(2,8);
  setupPeer(id,()=>{state={phase:"lobby",players:[me],dealerDone:false,results:null};showGame();setStatus("Đã tạo phòng. Hãy sao chép link mời bạn bè.");render();updateInviteLink()});
}
function joinRoom(){
  const name=$("nameInput").value.trim()||"Người chơi";
  const qs=new URLSearchParams(location.search);
  roomCode=($("roomInput").value.trim()||qs.get("room")||"").toUpperCase(); hostPeerId=qs.get("host")||"";
  if(!roomCode||!hostPeerId)return $("joinStatus").textContent="Link/mã phòng không hợp lệ. Hãy dùng link mời của Cái.";
  isHost=false;me={id:crypto.randomUUID(),name,role:"Người chơi",done:false};
  $("joinBtn").disabled=true;$("joinStatus").textContent="Đang kết nối với Cái…";
  setupPeer("xd-player-"+Math.random().toString(36).slice(2,10),()=>{
    const c=peer.connect(hostPeerId,{reliable:true,serialization:"json"});
    const timeout=setTimeout(()=>{if(!c.open){$("joinBtn").disabled=false;$("joinStatus").textContent="Không kết nối được Cái. Hãy yêu cầu Cái tạo link mới và giữ trang mở."}},8000);
    c.on("open",()=>{clearTimeout(timeout);conns.set("host",c);$("joinStatus").textContent="Đã vào phòng.";send(c,{t:"join",player:me})});
    c.on("data",handle); c.on("close",()=>setStatus("Mất kết nối với Cái."));
  });
}
function accept(c){
  c.on("data",m=>{
    if(m.t!=="join"){ hostMessage(m); return;}
    if(state.phase!=="lobby"){send(c,{t:"error",msg:"Ván đã bắt đầu. Hãy chờ ván sau."});c.close();return}
    if(state.players.length>=8){send(c,{t:"error",msg:"Phòng đã đủ người."});c.close();return}
    if(state.players.some(p=>p.id===m.player.id))return;
    conns.set(m.player.id,c);state.players.push({...m.player,done:false});
    send(c,{t:"state",state:publicState()});sync();
  });
  c.on("close",()=>{
    let gone=null;for(const [id,x] of conns)if(x===c){gone=id;conns.delete(id)}
    if(gone&&state){state.players=state.players.filter(p=>p.id!==gone);sync()}
  });
}
function handle(m){
  if(m.t==="state"){
    state=m.state;
    roomCode=m.state.room||roomCode;
    // Reset trạng thái cục bộ của người chơi khi vào lobby/ván mới.
    const mine=state.players.find(p=>p.id===me.id);
    if(mine) me.done=!!mine.done;
    if(state.phase==="lobby"){
      me.done=false;
      myHand=[];
    }
    showGame();
    render();
    return;
  }
  if(m.t==="deal"){myHand=m.hand||[];render();return}
  if(m.t==="draw"){
    myHand.push(m.card);
    const sp=special(myHand);
    // Chỉ tự dừng với các trường hợp luật bắt buộc: Xì Dách, Xì Bàng, Ngũ Linh, Quắc.
    // A + lá nhỏ vẫn được quyền Rút/Dừng bình thường.
    if(sp==="Xì Dách"||sp==="Xì Bàng"||sp==="Ngũ Linh"||sp==="Quắc"){
      me.done=true;
      send(conns.get("host"),{t:"action",id:me.id,done:true,summary:summarize(myHand),hand:myHand});
    }
    render();return
}
  if(m.t==="mustStop"){
    // Giữ tương thích nhưng không dùng để ép dừng nữa, tránh gửi action 2 lần.
    me.done=true;
    send(conns.get("host"),{t:"action",id:me.id,done:true,summary:summarize(myHand),hand:myHand});
    render();return
}
  if(m.t==="dealerDeal"){dealerHand=m.hand||[];render();return}
  if(m.t==="dealerDraw"){dealerHand=m.hand||[];render();return}
  if(m.t==="dealerPublic"){state.dealerDone=!!m.done;render();return}
  if(m.t==="result"){state.results=m.results;state.phase="result";render();return}
  if(m.t==="error"){$("joinStatus").textContent=m.msg;setStatus(m.msg);$("joinBtn").disabled=false;return}
}

function startRound(){
  if(!isHost||state.phase!=="lobby")return;
  deck=makeDeck(); state.phase="playing";state.results=null;state.dealerDone=false;state.turnIndex=state.players.findIndex(p=>p.id!==me.id);
  state.players.forEach(p=>{p.done=false; p.cardCount=2;});
  dealerHand=dealDealerStart();
  // Cái receives only Cái's cards. Each player receives only their own cards.
  for(const p of state.players){
    if(p.id===me.id)continue;
    const hand=[deck.pop(),deck.pop()];
    send(conns.get(p.id),{t:"deal",hand});
  }
  sendOwnDealer();sync();
}
function playerAction(draw){
  if(!state||state.phase!=="playing")return;
  if(isHost){
    if(!state.players.filter(p=>p.id!==me.id).every(p=>p.done))return;
    if(state.dealerDone)return;
    const v=val(dealerHand);
    if(draw){
      // Cho Cái được quyền rút tiếp dù đang 21 điểm.
      // Nếu Cái cố tình rút sau 21, ép lá tiếp theo để tổng thành 23 điểm (Quắc).
      if(v===21){
        const need = 23 - v;
        let forced = deck.find(c => val(dealerHand.concat([c])) === 23);
        if(!forced) forced = dealerCard();
        else deck.splice(deck.indexOf(forced),1);
        dealerHand.push(forced);
      }else{
        dealerHand.push(dealerCard());
      }
      if(val(dealerHand)>21||dealerHand.length>=5)state.dealerDone=true;
    }else{
      if(v<15){setStatus("Cái chưa đủ 15 điểm — phải Rút.");return}
      state.dealerDone=true;
    }
    state.players.find(p=>p.id===me.id).done=state.dealerDone;
    sendOwnDealer();sync();finishIfReady();return;
  }
  if(me.done)return;
  if(draw){
    if(state.players.findIndex(p=>p.id===me.id)!==state.turnIndex)return;
    if(val(myHand)>=21||myHand.length>=5)return;
    send(conns.get("host"),{t:"drawRequest",id:me.id});
  }else{
    me.done=true;send(conns.get("host"),{t:"action",id:me.id,done:true,summary:summarize(myHand),hand:myHand});
  }
  render();
}
function summarize(hand){return {score:val(hand),type:special(hand)||"Thường",power:power(hand)}}
function sendOwnDealer(){if(!isHost)return;render();broadcast({t:"dealerPublic",done:state.dealerDone})}
function renamePlayer(id,name){
  if(!isHost||!state)return;
  const p=state.players.find(x=>x.id===id);
  if(!p)return;
  p.name=String(name).trim().slice(0,20)||p.name;
  sync();
}
function hostMessage(m){
  if(!isHost||!state||state.phase!=="playing")return;
  const p=state.players.find(x=>x.id===m.id); if(!p)return;
  if(m.t==="rename"){
    renamePlayer(m.id,m.name);
    return;
  }
  if(m.t==="drawRequest"){
    if(p.done)return;
    // The host deals the next card but never receives the player's hand.
    const c=conns.get(p.id); if(!c)return;
    const existingCount=p.cardCount||2;
    if(existingCount>=5)return;
    // Client knows its current hand. Host only tracks count, not card values.
    const card=deck.pop(); p.cardCount=existingCount+1;
    send(c,{t:"draw",card});
    // Client tự kiểm tra Ngũ Linh/Quắc sau khi nhận lá bài. Không gửi mustStop ở đây để tránh kẹt lượt.
    return;
  }
  if(m.t==="action"){
    p.done=true;p.summary=m.summary||{score:0,type:"Thường",power:0};p.hand=m.hand||p.hand||[];
    nextTurn();
  }
}

function nextTurn(){
  const active=state.players;
  let i=(state.turnIndex==null?0:state.turnIndex)+1;
  while(i<active.length && (active[i].id===me.id || active[i].done))i++;
  state.turnIndex=i;
  if(i>=active.length){ state.turnIndex=active.length; }
  sync();
}

function finishIfReady(){
  if(!isHost||!state.dealerDone||!state.players.filter(p=>p.id!==me.id).every(p=>p.done))return;
  const ds=summarize(dealerHand);
  const results=state.players.filter(p=>p.id!==me.id).map(p=>{
    const ps=p.summary||{score:0,type:"Quắc",power:0};
    let outcome;
    if(ps.type==="Quắc")outcome="THUA";
    else if(ds.type==="Quắc")outcome="THẮNG";
    else outcome=ps.power>ds.power?"THẮNG":ps.power<ds.power?"THUA":"HÒA";
    return {id:p.id,name:p.name,score:ps.score,type:ps.type,outcome};
  });
  state.results={dealer:{score:ds.score,type:ds.type},players:results};state.phase="result";
  broadcast({t:"result",results:state.results});render();
  // Không lưu lịch sử: tự reset bàn chơi sau khi hiện kết quả ngắn.
  setTimeout(()=>{ if(isHost && state.phase==="result") resetRound(); },3000);
}
function resetRound(){if(!isHost)return;state.phase="lobby";state.results=null;state.dealerDone=false;state.turnIndex=0;state.players.forEach(p=>{p.done=false;delete p.summary;delete p.hand;delete p.cardCount});dealerHand=[];myHand=[];sync()}
function showGame(){
  $("joinScreen").classList.add("hidden");$("gameScreen").classList.remove("hidden");
  $("roomCode").textContent=roomCode;$("roleBadge").textContent=isHost?"CÁI":"NGƯỜI CHƠI";
  $("startBtn").style.display=isHost?"inline-block":"none";$("dealerPanel").classList.toggle("hidden",!isHost);$("myPanelTitle").textContent=isHost?"Bài của Cái":"Bài của tôi";
}
function render(){
  if(!state)return;
  $("players").innerHTML=state.players.map(p=>`<div class="player"><b>${escapeHtml(p.name)}</b><br><span class="badge">${p.role}</span><br>${p.done?"✅ Đã dừng":"🎯 Đang chơi"}${isHost&&p.id!==me.id?`<br><button class="small" onclick="renameMember('${p.id}')">✏️ Đổi tên</button>`:""}</div>`).join("");
  const h=isHost?dealerHand:myHand;
  $("myHand").innerHTML=h.length?h.map(face).join(""):backs(0);$("myScore").textContent=h.length?val(h):"-";
  const myIndex=state.players.findIndex(p=>p.id===me.id);
  const myTurn=isHost ? (state.players.filter(p=>p.id!==me.id).every(p=>p.done)&&!state.dealerDone) : myIndex===state.turnIndex;
  const disabled=state.phase!=="playing"||(!myTurn)||(!isHost&&me.done)||(isHost&&state.dealerDone);
  $("drawBtn").disabled=disabled;$("stopBtn").disabled=disabled;
  if(isHost){
    $("dealerHand").innerHTML=dealerHand.length?dealerHand.map(face).join(""):backs(0);$("dealerScore").textContent=dealerHand.length?val(dealerHand):"-";
    const mustDraw=state.phase==="playing"&&!state.dealerDone&&val(dealerHand)<15;
    $("dealerDrawBtn").disabled=state.phase!=="playing"||state.dealerDone;
    $("dealerStopBtn").disabled=state.phase!=="playing"||state.dealerDone||val(dealerHand)<15;
    $("dealerRule").textContent=mustDraw?"Cái đang dưới 15 điểm: bắt buộc Rút.":"Cái từ 15 điểm: có thể Rút hoặc Dừng.";
  }
  if(state.phase==="lobby")setStatus(isHost?"Bạn là Cái. Gửi link mời bạn bè rồi bấm “Bắt đầu ván”.":"Đang chờ Cái bắt đầu ván.");
  else if(state.phase==="playing")setStatus(isHost?`Cái hiện ${val(dealerHand)} điểm.` : (me.done?"Bạn đã Dừng — chờ những người còn lại.":(state.players.findIndex(p=>p.id===me.id)===state.turnIndex?"Đến lượt bạn — Rút hoặc Dừng.":"Chờ tới lượt bạn.")));
  if(isHost && state.phase==="playing"){
    const reveal=state.players.filter(p=>p.id!==me.id && p.hand && p.done).map(p=>`<div class="result"><b>${escapeHtml(p.name)}</b>: ${p.hand.map(face).join("")} (${val(p.hand)} điểm)</div>`).join("");
    if(reveal){$("resultPanel").classList.remove("hidden");$("results").innerHTML=reveal;}
  }
  if(state.results){$("resultPanel").classList.remove("hidden");$("results").innerHTML=`<div class="result"><b>Cái:</b> ${state.results.dealer.score} — ${state.results.dealer.type}</div>`+state.results.players.map(r=>`<div class="result"><b>${escapeHtml(r.name)}</b>: ${r.score} — ${r.type} → <strong>${r.outcome}</strong></div>`).join("");}
}
function renameMember(id){
  const p=state.players.find(x=>x.id===id);
  if(!p)return;
  const name=prompt("Nhập tên mới cho thành viên:",p.name);
  if(name&&name.trim()){
    renamePlayer(id,name);
  }
}
function updateInviteLink(){if(!isHost||!hostPeerId)return;const url=location.origin+location.pathname+"?room="+encodeURIComponent(roomCode)+"&host="+encodeURIComponent(hostPeerId);$("inviteLink").value=url}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}

$("createBtn").onclick=createRoom;$("joinBtn").onclick=joinRoom;$("startBtn").onclick=startRound;
$("drawBtn").onclick=()=>playerAction(true);$("stopBtn").onclick=()=>playerAction(false);
$("dealerDrawBtn").onclick=()=>playerAction(true);$("dealerStopBtn").onclick=()=>playerAction(false);$("nextRoundBtn").onclick=resetRound;
$("copyBtn").onclick=async()=>{try{await navigator.clipboard.writeText($("inviteLink").value);setStatus("Đã sao chép link mời.")}catch{setStatus("Không sao chép tự động được. Hãy copy link trong ô bên cạnh.")}};
$("leaveBtn").onclick=()=>location.reload();
$("inviteLink").onclick=()=>$("inviteLink").select();

const qs=new URLSearchParams(location.search);if(qs.get("room"))$("roomInput").value=qs.get("room");
