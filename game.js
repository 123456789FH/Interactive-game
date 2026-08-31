(()=>{
  'use strict';

  const AR_DIGITS='٠١٢٣٤٥٦٧٨٩';
  const ar=(value)=>String(value).replace(/\d/g,d=>AR_DIGITS[Number(d)]);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const shuffle=(arr)=>{
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  };
  const pick=(arr)=>arr[Math.floor(Math.random()*arr.length)];

  const places={thousands:1000,hundreds:100,tens:10,ones:1};
  const labels={thousands:'الألوف',hundreds:'المئات',tens:'العشرات',ones:'الآحاد'};
  const placeOrder=['thousands','hundreds','tens','ones'];

  const els={
    stage:document.querySelector('#stage'), score:document.querySelector('#scoreDisplay'), level:document.querySelector('#levelDisplay'), progress:document.querySelector('#progress'),
    hintTitle:document.querySelector('#hintTitle'), hintText:document.querySelector('#hintText'), targetCard:document.querySelector('#targetCard'), targetLabel:document.querySelector('#targetLabel'), target:document.querySelector('#targetDisplay'), built:document.querySelector('#builtDisplay'), builtCard:document.querySelector('#builtCard'),
    quizPanel:document.querySelector('#quizPanel'), quizKicker:document.querySelector('#quizKicker'), quizQuestion:document.querySelector('#quizQuestion'), quizPrompt:document.querySelector('#quizPrompt'), options:document.querySelector('#options'), quizStatus:document.querySelector('#quizStatus'),
    reset:document.querySelector('#resetBtn'), check:document.querySelector('#checkBtn'), home:document.querySelector('#homeBtn'), sound:document.querySelector('#soundBtn'), currentStars:document.querySelector('#currentStars'), chest:document.querySelector('#chestEffect'), toast:document.querySelector('#toast'), confetti:document.querySelector('#confetti'), ghost:document.querySelector('#dragGhost'),
    startScreen:document.querySelector('#startScreen'), studentName:document.querySelector('#studentName'), start:document.querySelector('#startBtn'), rewardScreen:document.querySelector('#rewardScreen'), rewardTitle:document.querySelector('#rewardTitle'), rewardMessage:document.querySelector('#rewardMessage'), rewardStars:document.querySelector('#rewardStars'), rewardScore:document.querySelector('#rewardScore'), next:document.querySelector('#nextBtn'),
    certificateScreen:document.querySelector('#certificateScreen'), certificateName:document.querySelector('#certificateName'), certificateScore:document.querySelector('#certificateScore'), certificateStars:document.querySelector('#certificateStars'), certificateDate:document.querySelector('#certificateDate'), print:document.querySelector('#printBtn'), replay:document.querySelector('#replayBtn')
  };
  const countEls=Object.fromEntries(placeOrder.map(k=>[k,document.querySelector('#count'+k[0].toUpperCase()+k.slice(1))]));
  const modelEls=[...document.querySelectorAll('.model')];
  const doorEls=[...document.querySelectorAll('.door')];

  const state={
    level:1, score:0, totalStars:0, roundStars:3, attempts:0, sound:true, selected:null, solved:false,
    student:'', target:427, counts:{thousands:0,hundreds:0,tens:0,ones:0},
    quiz:null, finalStep:0, finalQuestions:[]
  };

  function progressMarkup(){
    els.progress.innerHTML='';
    for(let i=1;i<=5;i++){
      const s=document.createElement('span');
      s.textContent=ar(i);
      if(i<state.level)s.classList.add('done');
      if(i===state.level)s.classList.add('current');
      els.progress.appendChild(s);
    }
  }

  function totalBuilt(){return placeOrder.reduce((sum,k)=>sum+state.counts[k]*places[k],0)}
  function digitsOf(n){return {thousands:Math.floor(n/1000)%10,hundreds:Math.floor(n/100)%10,tens:Math.floor(n/10)%10,ones:n%10}}
  function randomNumber(min=100,max=9999){return Math.floor(Math.random()*(max-min+1))+min}
  function randomFriendlyNumber(){
    let n=randomNumber(1000,9999);
    // وجود صفر واحد أحيانًا يجعل السؤال أعمق، لكن نتجنب الأعداد المربكة جدًا.
    if(Math.random()<.45){const d=digitsOf(n);const key=pick(['hundreds','tens','ones']);d[key]=0;n=d.thousands*1000+d.hundreds*100+d.tens*10+d.ones}
    return n;
  }

  function expanded(n){
    const d=digitsOf(n),parts=[];
    if(d.thousands)parts.push(d.thousands*1000);
    if(d.hundreds)parts.push(d.hundreds*100);
    if(d.tens)parts.push(d.tens*10);
    if(d.ones||!parts.length)parts.push(d.ones);
    return parts.map(ar).join(' + ');
  }

  function under100(n){
    const ones=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة'];
    const teens={10:'عشرة',11:'أحد عشر',12:'اثنا عشر',13:'ثلاثة عشر',14:'أربعة عشر',15:'خمسة عشر',16:'ستة عشر',17:'سبعة عشر',18:'ثمانية عشر',19:'تسعة عشر'};
    const tens={20:'عشرون',30:'ثلاثون',40:'أربعون',50:'خمسون',60:'ستون',70:'سبعون',80:'ثمانون',90:'تسعون'};
    if(n<10)return ones[n];
    if(n<20)return teens[n];
    const t=Math.floor(n/10)*10,o=n%10;
    return o?ones[o]+' و'+tens[t]:tens[t];
  }
  function numberWords(n){
    n=clamp(Math.floor(Number(n)||0),0,9999);
    if(n===0)return 'صفر';
    const parts=[];
    const th=Math.floor(n/1000),h=Math.floor((n%1000)/100),r=n%100;
    if(th){
      const thWords=['','ألف','ألفان','ثلاثة آلاف','أربعة آلاف','خمسة آلاف','ستة آلاف','سبعة آلاف','ثمانية آلاف','تسعة آلاف'];
      parts.push(thWords[th]);
    }
    if(h){
      const hWords=['','مائة','مائتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
      parts.push(hWords[h]);
    }
    if(r)parts.push(under100(r));
    return parts.join(' و');
  }

  function distractNumbers(correct){
    const d=digitsOf(correct),candidates=[];
    candidates.push(d.thousands*1000+d.hundreds*100+d.ones*10+d.tens);
    candidates.push(d.thousands*1000+d.tens*100+d.hundreds*10+d.ones);
    candidates.push(d.hundreds*1000+d.thousands*100+d.tens*10+d.ones);
    candidates.push(correct+10,correct-10,correct+100,correct-100,correct+1000,correct-1000);
    const uniq=[...new Set(candidates.filter(n=>n>=0&&n<=9999&&n!==correct))];
    while(uniq.length<3){const n=randomNumber(100,9999);if(n!==correct&&!uniq.includes(n))uniq.push(n)}
    return shuffle(uniq).slice(0,3);
  }
  function distractExpanded(correct){return distractNumbers(correct).map(expanded)}
  function distractWords(correct){return distractNumbers(correct).map(numberWords)}

  function setRoundStars(n){
    state.roundStars=clamp(n,1,3);
    [...els.currentStars.children].forEach((s,i)=>s.classList.toggle('on',i<state.roundStars));
  }
  function registerWrong(){state.attempts++;setRoundStars(3-Math.min(2,state.attempts))}

  let toastTimer=null;
  function toast(text){
    els.toast.textContent=text;els.toast.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1900);
  }

  function tone(freq=620,dur=.08){
    if(!state.sound)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      const ctx=tone.ctx||(tone.ctx=new AC());
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;
      g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);
      o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur);
    }catch(_){ }
  }

  function burstConfetti(){
    els.confetti.innerHTML='';const colors=['#ffd84c','#fff7c7','#69d8ff','#89db55','#c784ff','#ff8c56'];
    for(let i=0;i<52;i++){
      const p=document.createElement('i');p.style.left=(Math.random()*100)+'%';p.style.setProperty('--c',colors[i%colors.length]);p.style.setProperty('--r',(Math.random()*180)+'deg');p.style.setProperty('--x',((Math.random()-.5)*220)+'px');p.style.animationDelay=(Math.random()*.35)+'s';els.confetti.appendChild(p);
    }
    setTimeout(()=>els.confetti.innerHTML='',2100);
  }

  function openChest(){
    els.chest.classList.remove('open');void els.chest.offsetWidth;els.chest.classList.add('open');
    setTimeout(()=>els.chest.classList.remove('open'),2200);
  }

  function renderCore(){
    els.score.textContent=ar(state.score);els.level.textContent=ar(state.level);progressMarkup();
    els.built.textContent=ar(totalBuilt());
    placeOrder.forEach(k=>countEls[k].textContent=ar(state.counts[k]));
    modelEls.forEach(el=>el.classList.toggle('selected',el.dataset.model===state.selected));
  }

  function resetBuild(showMessage=true){
    placeOrder.forEach(k=>state.counts[k]=0);state.selected=null;state.solved=false;state.attempts=0;setRoundStars(3);renderCore();
    if(showMessage)toast('ابدأ من جديد وابنِ العدد المطلوب.');
  }

  function showBuildLevel(){
    document.body.classList.remove('quiz-mode');els.quizPanel.hidden=true;els.targetCard.hidden=false;els.builtCard.hidden=false;els.reset.hidden=false;els.check.hidden=false;
    state.target=randomNumber(120,9876);state.solved=false;state.attempts=0;setRoundStars(3);placeOrder.forEach(k=>state.counts[k]=0);state.selected=null;
    els.targetLabel.textContent='العدد المطلوب';els.target.textContent=ar(state.target);
    els.hintTitle.textContent='ابنِ العدد';els.hintText.textContent='اختر نموذج القيمة المنزلية، ثم ضعه في الباب المناسب. اضغط العدد أعلى الباب لتقليل نموذج واحد.';
    els.check.textContent='✓ تحقق وافتح الكنز';renderCore();toast('كوّن العدد '+ar(state.target)+' باستخدام النماذج.');
  }

  function makeQuiz(kind,n){
    const quiz={kind,n,correct:null,prompt:'',question:'',kicker:'',options:[]};
    if(kind==='standard'){
      quiz.kicker='الصيغة القياسية';quiz.question='ما العدد الذي تمثله الصيغة التحليلية؟';quiz.prompt=expanded(n);quiz.correct=ar(n);quiz.options=shuffle([quiz.correct,...distractNumbers(n).map(ar)]);
    }else if(kind==='expanded'){
      quiz.kicker='الصيغة التحليلية';quiz.question='اختر الصيغة التحليلية الصحيحة للعدد';quiz.prompt=ar(n);quiz.correct=expanded(n);quiz.options=shuffle([quiz.correct,...distractExpanded(n)]);
    }else if(kind==='words'){
      quiz.kicker='الصيغة اللفظية';quiz.question='اختر الصيغة اللفظية الصحيحة للعدد';quiz.prompt=ar(n);quiz.correct=numberWords(n);quiz.options=shuffle([quiz.correct,...distractWords(n)]);
    }else if(kind==='wordsToStandard'){
      quiz.kicker='من اللفظية إلى القياسية';quiz.question='اختر العدد المطابق للصيغة اللفظية';quiz.prompt=numberWords(n);quiz.correct=ar(n);quiz.options=shuffle([quiz.correct,...distractNumbers(n).map(ar)]);
    }else if(kind==='expandedToWords'){
      quiz.kicker='تحدي الكنز';quiz.question='اختر الصيغة اللفظية التي تمثل هذا العدد';quiz.prompt=expanded(n);quiz.correct=numberWords(n);quiz.options=shuffle([quiz.correct,...distractWords(n)]);
    }
    return quiz;
  }

  function showQuiz(quiz){
    document.body.classList.add('quiz-mode');els.quizPanel.hidden=false;els.targetCard.hidden=true;els.builtCard.hidden=true;els.reset.hidden=true;els.check.hidden=true;
    state.quiz=quiz;state.solved=false;state.attempts=0;setRoundStars(3);
    els.quizKicker.textContent=quiz.kicker;els.quizQuestion.textContent=quiz.question;els.quizPrompt.textContent=quiz.prompt;els.quizPrompt.classList.toggle('words',quiz.kind==='wordsToStandard'||quiz.kind==='expandedToWords');els.quizStatus.textContent='';
    els.options.innerHTML='';
    quiz.options.forEach(text=>{
      const b=document.createElement('button');b.type='button';b.className='option';b.textContent=text;b.dataset.value=text;b.addEventListener('click',()=>answerQuiz(b));els.options.appendChild(b);
    });
    els.hintTitle.textContent=quiz.kicker;els.hintText.textContent=state.level===5?'التحدي النهائي '+ar(state.finalStep+1)+' من ٣. اختر الإجابة الصحيحة لتحصل على نجمة الكنز.':'اقرأ السؤال جيدًا، ثم اختر الإجابة الصحيحة من البطاقات.';
    renderCore();
  }

  function answerQuiz(button){
    if(state.solved)return;
    if(button.dataset.value===state.quiz.correct){
      state.solved=true;button.classList.add('correct');[...els.options.children].forEach(b=>b.disabled=true);tone(880,.12);setTimeout(()=>tone(1100,.12),90);openChest();burstConfetti();
      finishCurrentRound();
    }else{
      registerWrong();button.classList.add('wrong');button.disabled=true;tone(190,.12);els.quizStatus.textContent='حاول مرة أخرى؛ راجع قيمة كل منزلة.';toast('ليست الإجابة الصحيحة بعد. حاول مرة أخرى.');
    }
  }

  function finishCurrentRound(){
    const gained=state.roundStars*10;state.score+=gained;state.totalStars+=state.roundStars;renderCore();
    if(state.level===5){
      state.finalStep++;
      if(state.finalStep<state.finalQuestions.length){
        els.quizStatus.textContent='أحسنت! انتقل إلى التحدي التالي.';
        setTimeout(()=>showQuiz(state.finalQuestions[state.finalStep]),950);
      }else{
        setTimeout(showCertificate,1100);
      }
      return;
    }
    setTimeout(()=>showReward(gained),650);
  }

  function showReward(gained){
    els.rewardStars.textContent='★'.repeat(state.roundStars)+'☆'.repeat(3-state.roundStars);els.rewardScore.textContent=ar(gained);els.rewardMessage.textContent='فتحت كنز المستوى '+ar(state.level)+' وحصلت على '+ar(state.roundStars)+' نجوم.';els.next.textContent=state.level===4?'ابدأ التحدي النهائي':'المستوى التالي';els.rewardScreen.hidden=false;
  }

  function nextLevel(){
    els.rewardScreen.hidden=true;state.level++;
    if(state.level===2){const n=randomFriendlyNumber();showQuiz(makeQuiz('standard',n));}
    else if(state.level===3){const n=randomFriendlyNumber();showQuiz(makeQuiz('expanded',n));}
    else if(state.level===4){const n=randomFriendlyNumber();showQuiz(makeQuiz('words',n));}
    else if(state.level===5){
      state.finalStep=0;
      state.finalQuestions=[makeQuiz('wordsToStandard',randomFriendlyNumber()),makeQuiz('expandedToWords',randomFriendlyNumber()),makeQuiz('standard',randomFriendlyNumber())];
      showQuiz(state.finalQuestions[0]);
    }
    renderCore();
  }

  function showCertificate(){
    state.level=5;renderCore();
    const name=(state.student||'بطل الرياضيات').trim();els.certificateName.textContent=name;els.certificateScore.textContent=ar(state.score);els.certificateStars.textContent=ar(state.totalStars);
    const date=new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());els.certificateDate.textContent='التاريخ: '+date+'م';
    els.certificateScreen.hidden=false;burstConfetti();tone(1000,.14);setTimeout(()=>tone(1250,.16),130);
  }

  function animateModelToDoor(place){
    const source=document.querySelector('[data-model="'+place+'"]');
    const door=document.querySelector('[data-place="'+place+'"].door');
    if(!source||!door)return;
    const a=source.getBoundingClientRect(),b=door.getBoundingClientRect();
    const fly=document.createElement('div');
    fly.className='fly-model';
    fly.textContent=ar(places[place]);
    const x=a.left+a.width/2-31,y=a.top+a.height/2-31;
    const dx=(b.left+b.width/2-31)-x,dy=(b.top+b.height*.72-31)-y;
    fly.style.left=x+'px';fly.style.top=y+'px';
    document.body.appendChild(fly);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      fly.style.transform='translate('+dx+'px,'+dy+'px) scale(.56)';
      fly.style.opacity='.18';
    }));
    setTimeout(()=>fly.remove(),470);
  }

  function addModel(place){
    if(state.level!==1||state.solved)return;
    if(state.counts[place]>=9){tone(200,.1);toast('وصلت إلى ٩ نماذج في منزلة '+labels[place]+'.');return;}
    state.counts[place]++;animateModelToDoor(place);renderCore();tone(650,.06);flashDoor(place,true);
  }
  function removeModel(place){
    if(state.level!==1||state.solved)return;
    if(state.counts[place]<=0){toast('لا يوجد نموذج لإزالته من '+labels[place]+'.');return;}
    state.counts[place]--;countEls[place].classList.remove('decrease');void countEls[place].offsetWidth;countEls[place].classList.add('decrease');renderCore();tone(400,.05);
  }
  function flashDoor(place,ok){
    const el=document.querySelector('#door'+place[0].toUpperCase()+place.slice(1));
    const cls=ok?'correct-flash':'wrong-flash';
    el.classList.remove(cls,'portal-pop');void el.offsetWidth;el.classList.add(cls);
    if(ok){el.classList.add('portal-pop');setTimeout(()=>el.classList.remove('portal-pop'),460)}
  }
  function tryPlace(model,door){
    if(model===door){addModel(door);state.selected=null;renderCore();toast('أحسنت، هذا النموذج في منزلة '+labels[door]+'.');return true;}
    flashDoor(door,false);registerWrong();tone(190,.11);toast('راجع قيمة النموذج والمنزلة المناسبة.');return false;
  }

  function checkBuild(){
    if(state.level!==1)return;
    if(state.solved){return;}
    const built=totalBuilt();
    if(built===state.target){state.solved=true;tone(880,.12);setTimeout(()=>tone(1100,.12),90);openChest();burstConfetti();finishCurrentRound();}
    else{
      registerWrong();tone(190,.12);
      if(built<state.target)toast('العدد الذي بنيته أصغر من '+ar(state.target)+'. أضف نماذج مناسبة.');
      else toast('العدد الذي بنيته أكبر من '+ar(state.target)+'. قلّل بعض النماذج بالضغط على العدد أعلى الباب.');
    }
  }

  function restartGame(showStart=true){
    state.level=1;state.score=0;state.totalStars=0;state.finalStep=0;state.finalQuestions=[];state.quiz=null;state.solved=false;els.rewardScreen.hidden=true;els.certificateScreen.hidden=true;document.body.classList.remove('quiz-mode');els.chest.classList.remove('open');showBuildLevel();
    if(showStart)els.startScreen.hidden=false;
  }

  // نقر البطاقات والأبواب
  modelEls.forEach(el=>{
    el.addEventListener('click',()=>{
      if(state.level!==1||state.solved)return;
      if(el.dataset.dragged==='1'){el.dataset.dragged='0';return;}
      state.selected=el.dataset.model;renderCore();toast('تم اختيار نموذج '+labels[state.selected]+'. اضغط الباب المناسب.');
    });
  });
  doorEls.forEach(el=>el.addEventListener('click',()=>{
    if(state.level!==1||state.solved)return;
    if(!state.selected){toast('اختر نموذجًا من بطاقات القيمة المنزلية أولًا.');return;}
    tryPlace(state.selected,el.dataset.place);
  }));
  Object.entries(countEls).forEach(([place,el])=>{
    const act=()=>removeModel(place);el.addEventListener('click',act);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}});
  });

  // سحب Pointer Events: يعمل بالماوس واللمس والقلم.
  modelEls.forEach(el=>{
    let drag=null;
    el.addEventListener('pointerdown',ev=>{
      if(state.level!==1||state.solved)return;
      drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false,model:el.dataset.model};
      const ghostValue=els.ghost.querySelector('span');if(ghostValue)ghostValue.textContent=ar(places[el.dataset.model]);
      el.setPointerCapture?.(ev.pointerId);
    });
    el.addEventListener('pointermove',ev=>{
      if(!drag||drag.id!==ev.pointerId)return;
      if(!drag.moved&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<8)return;
      drag.moved=true;el.dataset.dragged='1';els.ghost.classList.add('show');els.ghost.style.left=(ev.clientX-36)+'px';els.ghost.style.top=(ev.clientY-36)+'px';
    });
    const end=ev=>{
      if(!drag||drag.id!==ev.pointerId)return;els.ghost.classList.remove('show');
      if(drag.moved){const under=document.elementFromPoint(ev.clientX,ev.clientY);const door=under?.closest?.('.door');if(door)tryPlace(drag.model,door.dataset.place);else toast('أسقط البطاقة داخل الباب المناسب.');}
      drag=null;
    };
    el.addEventListener('pointerup',end);el.addEventListener('pointercancel',()=>{els.ghost.classList.remove('show');drag=null;});
  });

  els.check.addEventListener('click',checkBuild);
  els.reset.addEventListener('click',()=>resetBuild(true));
  els.sound.addEventListener('click',()=>{state.sound=!state.sound;toast(state.sound?'المؤثرات الصوتية مفعلة.':'المؤثرات الصوتية متوقفة.');if(state.sound)tone(620,.07)});
  els.home.addEventListener('click',()=>restartGame(true));
  els.start.addEventListener('click',()=>{state.student=els.studentName.value.trim();els.startScreen.hidden=true;restartGame(false);toast('ابدأ رحلتك إلى صندوق الكنز!');});
  els.studentName.addEventListener('keydown',e=>{if(e.key==='Enter')els.start.click();});
  els.next.addEventListener('click',nextLevel);
  els.print.addEventListener('click',()=>window.print());
  els.replay.addEventListener('click',()=>{els.certificateScreen.hidden=true;restartGame(false);toast('بدأت مغامرة جديدة.');});

  // تهيئة
  setRoundStars(3);progressMarkup();showBuildLevel();els.startScreen.hidden=false;
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
