const COLORS={ink:'#132b27',jade:'#0f6b5b',mint:'#76bea5',gold:'#dda33a',coral:'#dd684b',grid:'#e6ebe7',muted:'#63736f'};
const monthFmt=new Intl.DateTimeFormat('en-US',{month:'short'});
const monthYearFmt=new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric'});
const num=new Intl.NumberFormat('en-US');
const moneyCompact=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1});
const compact=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
let DATA;

const baseLayout={font:{family:'DM Sans, sans-serif',color:COLORS.ink,size:12},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',margin:{l:60,r:20,t:24,b:52},hoverlabel:{bgcolor:COLORS.ink,font:{color:'#fff'}},xaxis:{gridcolor:COLORS.grid,zeroline:false},yaxis:{gridcolor:COLORS.grid,zeroline:false},legend:{orientation:'h',y:1.12,x:0}};
const config={responsive:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d','autoScale2d']};
const clone=o=>JSON.parse(JSON.stringify(o));
const date=s=>new Date(`${s.slice(0,10)}T00:00:00`);
const pct=v=>`${(v*100).toFixed(1)}%`;
const sum=(rows,key)=>rows.reduce((a,r)=>a+(Number(r[key])||0),0);
const titleCase=s=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace("Prince George'S","Prince George's").replace("Queen Anne'S","Queen Anne's").replace("St. Mary'S","St. Mary's");
const yearOf=r=>Number(r.date.slice(0,4));

function plot(id,traces,layout={}){const merged={...clone(baseLayout),...layout,xaxis:{...baseLayout.xaxis,...(layout.xaxis||{})},yaxis:{...baseLayout.yaxis,...(layout.yaxis||{})}};Plotly.react(id,traces,merged,config)}

function populateFilters(){
  const years=[...new Set(DATA.registrations.map(yearOf))].sort((a,b)=>b-a);
  const year=document.querySelector('#yearSelect');
  years.forEach(y=>year.add(new Option(`${y}${y===2026?' (partial)':''}`,y)));
  year.value=years.includes(2025)?'2025':String(years[0]);
  const county=document.querySelector('#countySelect');
  county.add(new Option('Statewide total','STATEWIDE'));
  [...new Set(DATA.registrations.map(r=>r.county))].sort().forEach(c=>county.add(new Option(titleCase(c),c)));
  year.addEventListener('change',render);
  county.addEventListener('change',render);
  document.querySelector('#resetButton').addEventListener('click',()=>{year.value='2025';county.value='STATEWIDE';render()});
}

function renderKpis(year,sales,regs,county){
  const total=sum(sales,'total_units'),used=sum(sales,'used_units'),value=sum(sales,'total_value');
  const latest=regs.at(-1),first=regs[0];
  const delta=latest&&first?(latest.vehicle_count-first.vehicle_count)/first.vehicle_count:null;
  const cards=[
    ['Total vehicles sold',total?num.format(total):'Not available',`${sales.length} month${sales.length===1?'':'s'} reported`,COLORS.jade],
    ['Used-vehicle share',total?pct(used/total):'Not available',total?`${num.format(used)} used units`:'No sales records',COLORS.coral],
    ['Sales value',value?moneyCompact.format(value):'Not available','New + used transactions',COLORS.gold],
    ['Registered vehicles',latest?num.format(latest.vehicle_count):'Not available',latest?`${delta>=0?'+':''}${pct(delta)} from first reported month · ${monthYearFmt.format(date(latest.date))}`:'No registration records',COLORS.mint]
  ];
  document.querySelector('#kpiGrid').innerHTML=cards.map(([label,value,detail,color])=>`<article class="kpi" style="--accent:${color}"><span class="kpi-label">${label}</span><strong class="kpi-value">${value}</strong><span class="kpi-detail">${detail}</span></article>`).join('');
  const peak=sales.reduce((best,r)=>!best||r.total_units>best.total_units?r:best,null);
  const place=county==='STATEWIDE'?'statewide':titleCase(county);
  document.querySelector('#insightText').innerHTML=peak?`<strong>${monthYearFmt.format(date(peak.date))} led ${year} sales</strong> with ${num.format(peak.total_units)} vehicles. Used vehicles represented ${pct(used/total)} of sales, while the latest ${place} registration snapshot counted ${latest?num.format(latest.vehicle_count):'no reported'} vehicles.`:`<strong>Registration view only.</strong> Sales records are not available for the selected year, but monthly registration snapshots remain explorable.`;
}

function renderSales(sales){
  const x=sales.map(r=>date(r.date));
  plot('salesChart',[{x,y:sales.map(r=>r.new_units),name:'New',type:'bar',marker:{color:COLORS.jade},hovertemplate:'%{x|%b %Y}<br>New: %{y:,}<extra></extra>'},{x,y:sales.map(r=>r.used_units),name:'Used',type:'bar',marker:{color:COLORS.gold},hovertemplate:'%{x|%b %Y}<br>Used: %{y:,}<extra></extra>'}],{barmode:'stack',xaxis:{tickformat:'%b'},yaxis:{tickformat:'~s',title:'Vehicles'}});
  plot('valueChart',[{x,y:sales.map(r=>r.new_value),name:'New value',type:'scatter',mode:'lines+markers',line:{color:COLORS.jade,width:3},marker:{size:6},hovertemplate:'%{x|%b %Y}<br>New: $%{y:,.0f}<extra></extra>'},{x,y:sales.map(r=>r.used_value),name:'Used value',type:'scatter',mode:'lines+markers',line:{color:COLORS.coral,width:3},marker:{size:6},hovertemplate:'%{x|%b %Y}<br>Used: $%{y:,.0f}<extra></extra>'}],{xaxis:{tickformat:'%b'},yaxis:{tickprefix:'$',tickformat:'~s'}});
}

function renderHistory(selectedYear){
  const annual=[...new Set(DATA.sales.map(yearOf))].sort().map(y=>{const rows=DATA.sales.filter(r=>yearOf(r)===y);return{year:y,newUnits:sum(rows,'new_units'),usedUnits:sum(rows,'used_units'),months:rows.length}});
  plot('historyChart',[{x:annual.map(r=>r.year),y:annual.map(r=>r.newUnits),name:'New',type:'scatter',mode:'lines',stackgroup:'one',line:{color:COLORS.jade,width:2},hovertemplate:'%{x}<br>New: %{y:,}<extra></extra>'},{x:annual.map(r=>r.year),y:annual.map(r=>r.usedUnits),name:'Used',type:'scatter',mode:'lines',stackgroup:'one',line:{color:COLORS.gold,width:2},hovertemplate:'%{x}<br>Used: %{y:,}<extra></extra>'}],{shapes:[{type:'line',x0:selectedYear,x1:selectedYear,y0:0,y1:1,yref:'paper',line:{color:COLORS.coral,width:2,dash:'dot'}}],annotations:[{x:selectedYear,y:1,yref:'paper',text:String(selectedYear),showarrow:false,yshift:12,font:{color:COLORS.coral}}],xaxis:{dtick:2,title:'Calendar year'},yaxis:{tickformat:'~s',title:'Vehicles sold'}});
}

function renderRegistrations(year,county){
  const all=DATA.registrations.filter(r=>yearOf(r)===year);
  const latestDate=all.map(r=>r.date).sort().at(-1);
  const ranking=all.filter(r=>r.date===latestDate&&r.county!=='NOT MD / UNSPECIFIED').sort((a,b)=>a.vehicle_count-b.vehicle_count);
  document.querySelector('#rankingBadge').textContent=latestDate?monthYearFmt.format(date(latestDate)):'No data';
  plot('rankingChart',[{x:ranking.map(r=>r.vehicle_count),y:ranking.map(r=>titleCase(r.county)),type:'bar',orientation:'h',marker:{color:ranking.map(r=>r.county===county?COLORS.coral:COLORS.jade)},hovertemplate:'%{y}<br>%{x:,} vehicles<extra></extra>'}],{showlegend:false,margin:{l:115,r:20,t:20,b:48},xaxis:{tickformat:'~s',title:'Registered vehicles'},yaxis:{gridcolor:'rgba(0,0,0,0)',automargin:true}});
  const state=DATA.statewide.filter(r=>yearOf(r)===year);
  const selected=county==='STATEWIDE'?state:all.filter(r=>r.county===county);
  document.querySelector('#trendTitle').textContent=county==='STATEWIDE'?'Statewide registration trend':`${titleCase(county)} registration trend`;
  plot('registrationChart',[{x:selected.map(r=>date(r.date)),y:selected.map(r=>r.vehicle_count),type:'scatter',mode:'lines+markers',name:county==='STATEWIDE'?'Statewide':titleCase(county),line:{color:COLORS.jade,width:3},fill:'tozeroy',fillcolor:'rgba(15,107,91,.08)',hovertemplate:'%{x|%b %Y}<br>%{y:,} vehicles<extra></extra>'}],{showlegend:false,xaxis:{tickformat:'%b'},yaxis:{tickformat:'~s',title:'Registered vehicles',rangemode:'tozero'}});
  return selected;
}

function renderRelationship(year,sales,selectedRegs){
  const regMap=new Map(selectedRegs.map(r=>[r.date,r.vehicle_count]));
  const matched=sales.filter(r=>regMap.has(r.date));
  plot('relationshipChart',[{x:matched.map(r=>regMap.get(r.date)),y:matched.map(r=>r.total_units),text:matched.map(r=>monthYearFmt.format(date(r.date))),type:'scatter',mode:'markers+text',textposition:'top center',marker:{size:matched.map(r=>Math.max(10,Math.min(28,r.total_value/100000000))),color:matched.map(r=>r.used_units/r.total_units),colorscale:[[0,COLORS.mint],[1,COLORS.coral]],showscale:true,colorbar:{title:'Used<br>share',tickformat:'.0%'},line:{color:'#fff',width:1}},hovertemplate:'%{text}<br>Registrations: %{x:,}<br>Sales: %{y:,}<extra></extra>'}],{showlegend:false,xaxis:{tickformat:'~s',title:'Registered vehicle stock'},yaxis:{tickformat:'~s',title:'Monthly vehicles sold'},margin:{l:70,r:70,t:30,b:60},annotations:matched.length?[]:[{text:`No shared sales and registration months in ${year}`,showarrow:false,x:.5,y:.5,xref:'paper',yref:'paper',font:{color:COLORS.muted}}]});
}

function render(){
  const year=Number(document.querySelector('#yearSelect').value),county=document.querySelector('#countySelect').value;
  const sales=DATA.sales.filter(r=>yearOf(r)===year).sort((a,b)=>a.date.localeCompare(b.date));
  const allRegs=DATA.statewide.filter(r=>yearOf(r)===year).sort((a,b)=>a.date.localeCompare(b.date));
  const countyRegs=county==='STATEWIDE'?allRegs:DATA.registrations.filter(r=>yearOf(r)===year&&r.county===county).sort((a,b)=>a.date.localeCompare(b.date));
  document.querySelector('#overviewTitle').textContent=`${year}${sales.length<12?' partial-year':''} snapshot`;
  document.querySelector('#filterNote').textContent=`Showing ${sales.length} sales month${sales.length===1?'':'s'} and ${countyRegs.length} registration snapshot${countyRegs.length===1?'':'s'}.`;
  renderKpis(year,sales,countyRegs,county);renderSales(sales);renderHistory(year);const selected=renderRegistrations(year,county);renderRelationship(year,sales,selected);
}

async function init(){
  try{
    const response=await fetch('data/dashboard_data.json');if(!response.ok)throw new Error(response.statusText);DATA=await response.json();
    document.querySelector('#coverageText').textContent=`Sales through ${monthYearFmt.format(date(DATA.metadata.sales_updated_through))}; registrations through ${monthYearFmt.format(date(DATA.metadata.registrations_updated_through))}.`;
    document.querySelector('#footerUpdate').textContent=`Source coverage updated through ${monthYearFmt.format(date(DATA.metadata.registrations_updated_through))}`;
    populateFilters();render();
  }catch(err){console.error(err);document.querySelector('#errorState').hidden=false}
}
window.addEventListener('DOMContentLoaded',init);
