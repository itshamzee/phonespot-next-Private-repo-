export default async ({ project }) => {
  const p = await project({ dir: "/home/user/phonespot-film", size: "960x540", fps: 24, background: "#eef0eb" });
  const steps = [
    ["Beskriv din enhed.", "Vælg model. Fortæl om stand,", "batteri og eventuelle skader.", ["Model", "Stand", "Dine oplysninger"]],
    ["Vi ser den igennem.", "Vi gennemgår dine oplysninger", "og vender tilbage med en vurdering.", ["Oplysninger", "Vurdering", "Eventuelt tilbud"]],
    ["Du bestemmer.", "Læs tilbuddet, og vælg selv,", "om du vil gå videre.", ["Dit tilbud", "Dit valg", "En aftale"]],
    ["Aflever eller send.", "Vi aftaler levering og betaling.", "Din enhed gennemgås som del af handlen.", ["Vejle", "Slagelse", "Send efter aftale"]]
  ];
  for (let i=0;i<4;i++) {
    const [title,line1,line2,tags]=steps[i];
    p.compose(
      <frame layout="none" width={960} height={540} background="#eef0eb">
        <rect x={610} y={0} width={350} height={540} fill="#1a3d2e" />
        <text x={52} y={40} width={500} height={30} fontFamily="DM Sans" fontSize={18} fontWeight={600} color="#1a3d2e">PhoneSpot · Sælg din enhed</text>
        <frame layout="none" x={52} y={140} width={530} height={255} motion={{enter:{from:{y:18,opacity:0},duration:0.65},exit:{to:{y:-8,opacity:0},duration:0.3,anchor:"end"}}}>
          <text x={0} y={0} width={530} height={130} fontFamily="DM Sans" fontSize={52} fontWeight={600} lineHeight={1.1} letterSpacing={-1.8} color="#1a3d2e">{title}</text>
          <text x={0} y={151} width={530} height={50} fontFamily="DM Sans" fontSize={24} color="#515e54">{line1}</text>
          <text x={0} y={187} width={530} height={66} fontFamily="DM Sans" fontSize={24} color="#515e54">{line2}</text>
        </frame>
        <text x={666} y={70} width={230} height={210} fontFamily="DM Sans" fontSize={172} fontWeight={500} letterSpacing={-10} color="#e8eedc" animate={[{property:"offsetY",from:14,to:0,duration:0.8},{property:"opacity",from:0,to:1,duration:0.65}]}>{String(i+1).padStart(2,"0")}</text>
        {tags.map((tag,j)=><frame key={tag} layout="none" x={650} y={305+j*55} width={270} height={44} at={0.8+j*.45} motion={{enter:{from:{x:18,opacity:0},duration:0.5}}}>
          <rect x={0} y={40} width={270} height={1} fill="#587260"/>
          <text x={2} y={0} width={270} height={36} fontFamily="DM Sans" fontSize={22} color="#f4f6ef">{tag}</text>
        </frame>)}
        <text x={52} y={435} width={530} height={25} fontFamily="DM Sans" fontSize={16} color="#59695b">Fra vurdering til aftale · phonespot.dk</text>
        {[0,1,2,3].map(j=><rect key={j} x={52+j*132} y={486} width={116} height={4} fill={j<i?"#1a3d2e":"#d4ddcf"}/>)}
        <rect x={52+i*132} y={486} width={116} height={4} fill="#1a3d2e" animate={[{property:"scaleX",from:0,to:1,duration:7,easing:"linear"}]}/>
      </frame>, {at:i*7,dur:7,name:"Trin "+(i+1)}
    );
  }
  await p.frame(2,"/home/user/phonespot-poster.png");
  await p.render("/home/user/phonespot-film.mp4",{depth:8,bitrate:1800000});
};
