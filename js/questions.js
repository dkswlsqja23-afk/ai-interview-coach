(function () {
  "use strict";

  function q(entry) {
    return Object.assign(
      {
        major: "general",
        template: false,
        expectsStar: false,
        followUps: [],
        keywords: [],
        focus: "",
        model: "",
      },
      entry
    );
  }

  const meta = {
    purposes: [
      { id: "exchange", ko: "교환학생", blurb: "지원 동기, 적응, 학업 계획" },
      { id: "internship", ko: "인턴 · 취업", blurb: "직무 역량, 협업, 성과" },
      { id: "admission", ko: "대입 면접", blurb: "전공 적합성, 경험, 사고력" },
    ],
    majors: [
      { id: "business", ko: "경영학", en: "business" },
      { id: "cs", ko: "컴퓨터공학", en: "computer science" },
      { id: "english", ko: "영어영문학", en: "English literature" },
      { id: "economics", ko: "경제학", en: "economics" },
      { id: "engineering", ko: "공학", en: "engineering" },
      { id: "ir", ko: "국제관계", en: "international relations" },
      { id: "undecided", ko: "분야 미정", en: "your field" },
    ],
    difficulties: [
      { id: "beginner", ko: "초급", blurb: "개인적인 질문, 짧은 문장" },
      { id: "intermediate", ko: "중급", blurb: "예시와 자신의 역할" },
      { id: "advanced", ko: "고급", blurb: "근거, 한계, 선택의 대가" },
    ],
  };

  const bank = [
    q({
      id: "ex-b-1",
      purposes: ["exchange"],
      difficulties: ["beginner"],
      focus: "유학 동기",
      text: "Why do you want to study abroad?",
      keywords: ["because", "learn", "study", "culture", "goal", "class", "major", "experience"],
      followUps: ["What is one class you hope to take there?"],
      model:
        "I want to study abroad because I hope to take classes in my major in English and understand a new culture from the inside. My goal is to join a seminar, not only travel, and come home with a clearer study plan.",
    }),
    q({
      id: "ex-b-2",
      purposes: ["exchange"],
      difficulties: ["beginner"],
      focus: "자기 배경을 쉽게 설명하기",
      text: "How would you introduce your hometown to a classmate abroad?",
      keywords: ["hometown", "city", "family", "food", "people", "example", "show", "neighborhood"],
      model:
        "My hometown is a busy city, but my neighborhood is quiet and full of small restaurants. For example, I would take a classmate to the night market and explain which dishes my family actually eats, not only the famous ones.",
    }),
    q({
      id: "ex-b-3",
      purposes: ["exchange"],
      difficulties: ["beginner"],
      focus: "새 환경에서의 적응",
      text: "What do you do when you feel nervous in a new place?",
      keywords: ["nervous", "talk", "class", "plan", "ask", "example", "friend", "small"],
      model:
        "When I feel nervous, I start with one small plan, such as talking to the person next to me in class. For example, last semester I asked a classmate one question after a lecture, and the next class felt easier.",
    }),
    q({
      id: "ex-b-4",
      purposes: ["exchange"],
      difficulties: ["beginner"],
      focus: "배움에 영향을 준 사람",
      text: "Tell me about a teacher who changed the way you study.",
      keywords: ["teacher", "class", "study", "learned", "example", "because", "changed", "writing"],
      model:
        "My writing teacher changed the way I study because she asked me to explain my point in one sentence before I added details. For example, I now start homework with that sentence, and my essays are easier to follow.",
    }),
    q({
      id: "ex-i-1",
      purposes: ["exchange"],
      difficulties: ["intermediate"],
      focus: "학업 계획과 학교 적합성",
      text: "Which kind of course do you want to take abroad, and why is that place a better fit?",
      keywords: ["course", "class", "seminar", "major", "because", "speak", "discussion", "plan"],
      followUps: ["How would you prepare for that course before the semester starts?"],
      model:
        "I want to take a seminar in my major where students discuss cases, because my home classes give me fewer chances to speak. That course is a better fit if the class is small and I have to defend an idea in English.",
    }),
    q({
      id: "ex-i-2",
      purposes: ["exchange"],
      difficulties: ["intermediate"],
      expectsStar: true,
      focus: "다른 사람과 협업한 경험",
      text: "Describe a time you worked with someone whose habits were very different from yours.",
      keywords: ["team", "different", "project", "role", "decided", "result", "learned", "meeting"],
      followUps: ["What would you do differently with that person next time?"],
      model:
        "Last semester I worked with a teammate who started from details while I wanted the main idea first. My role was the outline, and I decided we should meet twice a week before editing sentences. As a result, we finished on time, and I learned to agree on the process first.",
    }),
    q({
      id: "ex-i-3",
      purposes: ["exchange"],
      difficulties: ["intermediate"],
      focus: "귀국 후 계획",
      text: "How will one semester abroad change your plan after you return?",
      keywords: ["return", "plan", "major", "course", "because", "goal", "semester", "project"],
      model:
        "One semester abroad should show me which part of my major I want to study more deeply. For example, if the seminar is stronger than my home courses, I will choose my next project in that area when I return.",
    }),
    q({
      id: "ex-i-4",
      purposes: ["exchange"],
      difficulties: ["intermediate"],
      focus: "캠퍼스에 기여할 점",
      text: "What could you contribute to a student community at the host university?",
      keywords: ["contribute", "club", "students", "share", "major", "example", "discussion", "campus"],
      model:
        "I can contribute by connecting students who are curious about my home campus and my major. For example, I would help organize a small discussion, not only attend events, so the exchange is useful for other people too.",
    }),
    q({
      id: "ex-a-1",
      purposes: ["exchange"],
      difficulties: ["advanced"],
      focus: "적응과 자기 기준의 균형",
      text: "When should an exchange student adapt, and when should they keep the habits they built at home?",
      keywords: ["adapt", "habit", "class", "because", "however", "balance", "learn", "discussion"],
      followUps: ["Which of your own habits would be the hardest to keep, and why?"],
      model:
        "An exchange student should adapt to the local rules of class discussion, because those rules decide whether other people can follow. However, I would keep study habits that already work, such as rewriting notes in my own words, unless the new classroom proves that another habit is more useful.",
    }),
    q({
      id: "ex-a-2",
      purposes: ["exchange"],
      difficulties: ["advanced"],
      focus: "학업적 진정성",
      text: "Short exchanges are sometimes called academic tourism. How would you show that yours is not?",
      keywords: ["course", "project", "result", "because", "return", "academic", "plan", "paper"],
      model:
        "I would treat the semester as a project with a visible result, such as a paper I can explain after I return. Academic tourism has no audience at home. My plan is to bring back one argument I could not have made before the exchange.",
    }),
    q({
      id: "ex-a-3",
      purposes: ["exchange"],
      difficulties: ["advanced"],
      focus: "피드백에 대응하는 방식",
      text: "If a professor's feedback feels unfair, how do you respond in a second language?",
      keywords: ["professor", "feedback", "ask", "because", "example", "revise", "clarify", "respect"],
      model:
        "I would not argue in the moment. I would ask which part of the argument failed, because a second language makes it easy to confuse tone with content. Then I would revise that part before defending anything.",
    }),
    q({
      id: "ex-a-4",
      purposes: ["exchange"],
      difficulties: ["advanced"],
      focus: "자국에 대한 관점을 넓히기",
      text: "What belief about your own country are you willing to complicate after living abroad?",
      keywords: ["country", "belief", "however", "because", "example", "change", "student", "view"],
      model:
        "I grew up believing that speed is the main sign of a serious student in my country. I am willing to complicate that belief if classmates abroad produce stronger work by slowing down and revising. I would not abandon where I am from, but I want to describe it with more than one sentence.",
    }),
    q({
      id: "in-b-1",
      purposes: ["internship"],
      difficulties: ["beginner"],
      focus: "인턴 지원 동기",
      text: "Why are you interested in this internship?",
      keywords: ["internship", "learn", "major", "because", "team", "skill", "experience", "goal"],
      model:
        "I am interested in this internship because I want to use what I study in a real team, not only in class. My goal is to learn how a small task moves from an idea to something other people can use.",
    }),
    q({
      id: "in-b-2",
      purposes: ["internship"],
      difficulties: ["beginner"],
      focus: "1분 자기소개",
      text: "Tell me about yourself in about one minute.",
      keywords: ["major", "study", "interested", "project", "because", "goal", "team", "explain"],
      model:
        "I study my major, and I am most interested in turning a messy question into a clear next step. For example, in a recent class project I organized the research and practiced explaining it in simple English. I want an internship where I can do that for a real team.",
    }),
    q({
      id: "in-b-3",
      purposes: ["internship"],
      difficulties: ["beginner"],
      focus: "최근에 연습한 역량",
      text: "What is a skill you have practiced recently?",
      keywords: ["skill", "practice", "because", "example", "learned", "week", "writing", "better"],
      model:
        "I have practiced explaining my work in short English sentences. Every week I summarize a reading in five lines, because I used to write too much before the point. The skill is still rough, but it is better than last month.",
    }),
    q({
      id: "in-b-4",
      purposes: ["internship"],
      difficulties: ["beginner"],
      focus: "도움을 요청하는 방식",
      text: "How do you ask for help when you are stuck?",
      keywords: ["help", "ask", "stuck", "example", "because", "tried", "question", "teammate"],
      model:
        "When I am stuck, I first write down what I already tried, then I ask a specific question. For example, I would tell a teammate which step failed instead of saying I do not understand anything, because that helps them answer faster.",
    }),
    q({
      id: "in-i-1",
      purposes: ["internship"],
      difficulties: ["intermediate"],
      expectsStar: true,
      focus: "역할과 성과",
      text: "Tell me about a project where your role was clear. What did you do, and what was the result?",
      keywords: ["project", "role", "responsible", "result", "team", "learned", "interview", "evidence"],
      followUps: ["Which part of that result depended on you, not only on the team?"],
      model:
        "In a class consulting project, I was responsible for the customer interviews. I talked to eight students and grouped the repeated problems before our team chose a solution. As a result, the proposal used evidence instead of guesses, and I learned to separate a loud opinion from a common one.",
    }),
    q({
      id: "in-i-2",
      purposes: ["internship"],
      difficulties: ["intermediate"],
      expectsStar: true,
      focus: "의견 충돌을 다루는 방식",
      text: "Describe a time you disagreed with a teammate.",
      keywords: ["disagree", "teammate", "because", "listened", "result", "presentation", "learned", "decision"],
      followUps: ["How did you know the compromise was fair?"],
      model:
        "I disagreed with a teammate who wanted a long slide deck, because I thought the audience needed three points. I listened to his reason, then suggested we keep his research in the appendix and present only the decision. In the end the talk was clearer, and I learned that a disagreement should end with a format both people can use.",
    }),
    q({
      id: "in-i-3",
      purposes: ["internship"],
      difficulties: ["intermediate"],
      focus: "우선순위 판단",
      text: "How do you decide what to finish first when everything feels urgent?",
      keywords: ["first", "urgent", "because", "deadline", "team", "decide", "example", "waiting"],
      model:
        "I finish the task that blocks other people first, even if another task feels more interesting. For example, if a teammate needs my numbers before noon, that file comes before polishing my own slides, because their waiting is the real deadline.",
    }),
    q({
      id: "in-i-4",
      purposes: ["internship"],
      difficulties: ["intermediate"],
      focus: "약점과 관리 방법",
      text: "What weakness could show up at work, and how do you manage it?",
      keywords: ["weakness", "because", "manage", "example", "limit", "write", "faster", "facts"],
      model:
        "My weakness is spending too long on the first sentence before I have the facts. I manage it by setting a twenty-minute limit to collect the information, then I write. That rule has made my recent memos faster without making them careless.",
    }),
    q({
      id: "in-a-1",
      purposes: ["internship"],
      difficulties: ["advanced"],
      focus: "속도와 품질 사이의 선택",
      text: "Tell me about a tradeoff between speed and quality. Would you make the same choice again?",
      keywords: ["tradeoff", "speed", "quality", "because", "deadline", "however", "result", "again"],
      followUps: ["How would you signal the weak part to the audience?"],
      model:
        "I once chose speed so a team could meet a presentation deadline, and I cut two examples that still needed checking. I would make the same choice again only if the audience needed a decision that day, but I would mark the weak section out loud instead of hiding it.",
    }),
    q({
      id: "in-a-2",
      purposes: ["internship"],
      difficulties: ["advanced"],
      focus: "인턴 성과를 측정하는 기준",
      text: "How would you measure whether your internship was successful after eight weeks?",
      keywords: ["measure", "success", "week", "team", "because", "result", "output", "skill"],
      model:
        "I would measure success by one finished output that the team actually used, plus a skill I could not do in week one. A busy calendar is not evidence. A document or a process that someone else opens again would count.",
    }),
    q({
      id: "in-a-3",
      purposes: ["internship"],
      difficulties: ["advanced"],
      expectsStar: true,
      focus: "불완전한 정보로 실행하기",
      text: "Describe a time you acted with incomplete information.",
      keywords: ["information", "decided", "because", "assumption", "result", "learned", "project", "limit"],
      model:
        "During a group research project, we could not reach half of the people we hoped to interview. I was responsible for the summary, and I decided to label which findings were solid and which were only assumptions. As a result, the professor trusted the limited data more, and I learned that incomplete work should show its border.",
    }),
    q({
      id: "in-a-4",
      purposes: ["internship"],
      difficulties: ["advanced"],
      focus: "분야의 관행을 질문하기",
      text: "What is a common practice in your field that you would question?",
      keywords: ["field", "question", "because", "however", "practice", "example", "answer", "evidence"],
      model:
        "I would question the habit of presenting only the final answer, because my field often hides the failed attempts that explain the choice. However, audiences have limited time. A better practice is one short account of what was rejected, so the final answer is easier to trust.",
    }),
    q({
      id: "ad-b-1",
      purposes: ["admission"],
      difficulties: ["beginner"],
      focus: "대학 지원 동기",
      text: "Why do you want to study at this university?",
      keywords: ["university", "because", "major", "learn", "program", "goal", "class", "discussion"],
      model:
        "I want to study at this university because the program lets me go deeper into my major through discussion, not only lectures. My goal is to join a class where I have to explain my idea clearly to other students.",
    }),
    q({
      id: "ad-b-2",
      purposes: ["admission"],
      difficulties: ["beginner"],
      focus: "자신의 학습 방식",
      text: "What has a favorite class taught you about the way you learn?",
      keywords: ["class", "learn", "because", "example", "explain", "reading", "better", "question"],
      model:
        "My favorite class taught me that I learn better when I have to teach the idea back to someone. For example, after reading I explain the argument out loud, because silent highlighting does not show me what I missed.",
    }),
    q({
      id: "ad-b-3",
      purposes: ["admission"],
      difficulties: ["beginner"],
      focus: "수업 밖의 활동",
      text: "Tell me about an activity outside class that matters to you.",
      keywords: ["activity", "club", "because", "example", "people", "plan", "meeting", "explain"],
      model:
        "I spend time in a student club that plans small events for new members. It matters because I practice explaining a plan simply so other people can join. For example, I write a short introduction before each meeting.",
    }),
    q({
      id: "ad-b-4",
      purposes: ["admission"],
      difficulties: ["beginner"],
      focus: "향후 계획",
      text: "Where do you see yourself in four years?",
      keywords: ["years", "goal", "major", "because", "plan", "learn", "skill", "project"],
      model:
        "In four years I hope to be using my major in a project I can explain without notes. I do not need a perfect job title yet. My plan is to build one strong skill each year, starting with clear speaking and writing.",
    }),
    q({
      id: "ad-i-1",
      purposes: ["admission"],
      difficulties: ["intermediate"],
      focus: "전공을 고른 이유와 남은 질문",
      text: "Why this major, and what question in it do you still want to answer?",
      keywords: ["major", "question", "because", "interested", "evidence", "example", "study", "decision"],
      model:
        "I chose this major because I like questions that do not have a single clean answer. The question I still want to answer is how people decide when the evidence is incomplete. For example, I keep looking for that pattern in my class readings.",
    }),
    q({
      id: "ad-i-2",
      purposes: ["admission"],
      difficulties: ["intermediate"],
      expectsStar: true,
      focus: "소규모 리더십",
      text: "Describe a time you led a small group.",
      keywords: ["led", "group", "role", "decided", "result", "meeting", "learned", "presentation"],
      followUps: ["What would a teammate say was difficult about working with you?"],
      model:
        "I led a four-person study group before a presentation. My role was to divide the readings and keep the meeting short. We were only summarizing, so I asked each person for one claim and one piece of evidence. As a result, we finished the outline in one meeting, and I learned that leadership can be a better question.",
    }),
    q({
      id: "ad-i-3",
      purposes: ["admission"],
      difficulties: ["intermediate"],
      expectsStar: true,
      focus: "실패 이후의 변화",
      text: "Tell me about a failure that still affects how you work.",
      keywords: ["failure", "because", "learned", "presentation", "team", "practice", "result", "changed"],
      model:
        "I failed a group presentation because I prepared only my own part and never practiced the transitions. The result was a talk that sounded like four separate speeches. I now schedule one full run-through before any delivery, and that failure keeps me from calling a project finished too early.",
    }),
    q({
      id: "ad-i-4",
      purposes: ["admission"],
      difficulties: ["intermediate"],
      focus: "성적 밖의 기여",
      text: "How would you contribute to campus life beyond your grades?",
      keywords: ["campus", "contribute", "students", "because", "example", "discussion", "club", "help"],
      model:
        "I would contribute by helping new students practice how to join a discussion, because that was hard for me at first. For example, I could host a short session before club presentations so grades are not the only thing I add to campus.",
    }),
    q({
      id: "ad-a-1",
      purposes: ["admission"],
      difficulties: ["advanced"],
      focus: "쉽게 받아들이는 생각에 질문하기",
      text: "What is an idea in your field that most students accept too quickly?",
      keywords: ["field", "idea", "because", "however", "question", "evidence", "assume", "students"],
      model:
        "Many students in my field accept that a confident speaker has a strong idea. That assumption is too quick, because clear delivery can hide a missing example. A better habit is to ask what evidence would still matter if the voice were less certain.",
    }),
    q({
      id: "ad-a-2",
      purposes: ["admission"],
      difficulties: ["advanced"],
      focus: "근거를 보고 생각을 바꾼 경험",
      text: "Describe a time you changed your mind after reading or debating.",
      keywords: ["changed", "mind", "because", "reading", "evidence", "argument", "however", "before"],
      model:
        "I used to think a short answer was always a weak answer. I changed my mind after a seminar reading showed a one-page argument with better evidence than a long essay I preferred. I still value detail, but I now ask whether each sentence adds a reason.",
    }),
    q({
      id: "ad-a-3",
      purposes: ["admission"],
      difficulties: ["advanced"],
      focus: "야망과 주변 사람의 균형",
      text: "How should a student balance ambition with the people around them?",
      keywords: ["ambition", "people", "because", "team", "however", "goal", "project", "group"],
      model:
        "Ambition is useful when it makes the work better for the group, not only for the person who wants to stand out. I would state my goal early and ask what other people need from the same project. However, I would not pretend that I have no ambition, because hidden competition is harder to work with.",
    }),
    q({
      id: "ad-a-4",
      purposes: ["admission"],
      difficulties: ["advanced"],
      focus: "교육을 다시 설계하는 판단",
      text: "If you could redesign one part of high school, what would you change, and what would you refuse to lose?",
      keywords: ["school", "change", "because", "students", "class", "however", "teacher", "learn"],
      model:
        "I would change the habit of testing memory more often than explanation, because I learned more when I had to teach a chapter than when I reviewed a worksheet. I would refuse to lose teachers who stayed after class for one hard question. A redesign that keeps only efficiency would miss that part.",
    }),
    q({
      id: "tpl-b",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["beginner"],
      template: true,
      focus: "분야를 고른 이유",
      text: "What made you choose {major}, and what do you enjoy about it?",
      keywords: ["because", "enjoy", "learn", "class", "interested", "example", "chose", "study"],
      model:
        "I chose {major} because I enjoy taking a messy question and making it clear enough to explain. For example, I like classes where I have to show the steps, not only the final answer.",
    }),
    q({
      id: "tpl-i",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["intermediate"],
      template: true,
      focus: "어려운 개념을 일상 예시로 설명",
      text: "What is a difficult idea in {major} that you can explain with an everyday example?",
      keywords: ["example", "because", "idea", "explain", "difficult", "understand", "class", "choice"],
      model:
        "A difficult idea in {major} is that a good decision can still have a cost. An everyday example is studying with a group: you gain feedback, but you lose some control over the pace. I use that example because the tradeoff is clear before the technical word.",
    }),
    q({
      id: "tpl-a",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["advanced"],
      template: true,
      focus: "배우는 방식의 한계",
      text: "What is one limitation of the way {major} is usually taught, and how would you study around it?",
      keywords: ["limitation", "taught", "because", "however", "study", "class", "example", "practice"],
      model:
        "One limitation of the way {major} is usually taught is that students collect terms before they have a reason to use them. I study around it by attaching each new idea to a real case, then explaining it without the textbook. However, I still learn the precise words, because they help when the case gets complicated.",
    }),
    q({
      id: "maj-bus-1",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["beginner", "intermediate", "advanced"],
      major: "business",
      expectsStar: true,
      focus: "권한 없이 설득한 경험",
      text: "Tell me about a time you persuaded someone when you were not in charge.",
      keywords: ["persuaded", "because", "team", "budget", "result", "listened", "project", "decision"],
      model:
        "In a club project I was not the leader, but I persuaded the group to cut one event and spend the budget on materials we could reuse. I listened to the worry about losing attention, then showed a simple cost comparison. As a result, the club kept money for the next month, and I learned to persuade with a number.",
    }),
    q({
      id: "maj-bus-2",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["intermediate", "advanced"],
      major: "business",
      focus: "한정된 예산을 나누는 판단",
      text: "How would you decide whether a student group should spend most of its budget on one big event?",
      keywords: ["budget", "event", "because", "decide", "risk", "members", "however", "result"],
      model:
        "I would ask whether the event creates a result the group can use later, or only a crowd for one night. If most of the budget is at risk, I would test a smaller version first. However, I would approve a big event when the audience is clear and the group can learn from the outcome.",
    }),
    q({
      id: "maj-cs-1",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["beginner", "intermediate", "advanced"],
      major: "cs",
      expectsStar: true,
      focus: "프로젝트를 비전공자에게 설명",
      text: "Explain a project you made so someone who is not an engineer can follow the problem and your role.",
      keywords: ["project", "problem", "role", "built", "because", "result", "users", "page"],
      model:
        "I built a small schedule page for a student club because members kept missing the latest time. The problem was that updates were buried in a long chat, not that we lacked a complicated system. My role was to make one page with the next meeting. As a result, people checked one place, and I learned to describe the problem before the tool.",
    }),
    q({
      id: "maj-cs-2",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["intermediate", "advanced"],
      major: "cs",
      focus: "원인을 찾기 전에 고치지 않기",
      text: "When something you built does not work, how do you look for the cause before you change it?",
      keywords: ["cause", "test", "because", "change", "problem", "example", "check", "before"],
      model:
        "I do not change several things at once. I pick the smallest step that fails and compare what I expected with what happened. For example, if a button does nothing, I first check whether the click is received before I rewrite the page.",
    }),
    q({
      id: "maj-en-1",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["beginner", "intermediate", "advanced"],
      major: "english",
      focus: "읽기 방식이 바뀐 경험",
      text: "Which book, film, or essay changed the way you read, and what exactly changed?",
      keywords: ["read", "book", "because", "changed", "example", "story", "narrator", "notice"],
      model:
        "A short story changed the way I read because I noticed I was collecting the plot and missing the narrator's bias. After that, I mark who is speaking and what they cannot know. I now distrust a clean ending until I can explain whose comfort it protects.",
    }),
    q({
      id: "maj-en-2",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["intermediate", "advanced"],
      major: "english",
      focus: "정독 습관을 답변에 쓰기",
      text: "How does close reading help you answer a difficult question like this one?",
      keywords: ["reading", "question", "because", "evidence", "sentence", "claim", "example", "careful"],
      model:
        "Close reading trains me to answer from evidence instead of from a mood. In an interview I treat the question as a passage: I name the claim it asks for, then I attach one example. A careful sentence is more convincing than a long impression.",
    }),
    q({
      id: "maj-eco-1",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["beginner", "intermediate", "advanced"],
      major: "economics",
      focus: "시사 이슈를 쉽게 설명",
      text: "Explain a recent news story about prices, jobs, or trade in simple English.",
      keywords: ["price", "because", "people", "cost", "market", "example", "wages", "buy"],
      model:
        "A recent story about rising food prices is really about costs moving faster than wages for some families. When supply is tight, the same meal costs more, and people change what they buy. Anyone who shops can see that mechanism without a chart.",
    }),
    q({
      id: "maj-eco-2",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["intermediate", "advanced"],
      major: "economics",
      expectsStar: true,
      focus: "숫자가 의견을 바꾼 경험",
      text: "Tell me about a time numbers changed your opinion.",
      keywords: ["numbers", "opinion", "because", "changed", "before", "result", "evidence", "counted"],
      model:
        "I used to think a crowded campus event meant it was successful. Then I counted how many new members returned the next week, and the number was low. I changed the questions to ask why people left. The result showed that the room felt welcoming only to students who already had friends.",
    }),
    q({
      id: "maj-eng-1",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["beginner", "intermediate", "advanced"],
      major: "engineering",
      expectsStar: true,
      focus: "문제를 단계적으로 해결",
      text: "Walk me through a problem you solved step by step. Where did the first idea fail?",
      keywords: ["problem", "first", "failed", "because", "tested", "changed", "result", "step"],
      model:
        "I worked on a small bridge model that bent too much in the middle. My first idea was to add material everywhere, but it failed because the model became heavy and still bent at the same point. I reinforced only that joint and tested again. As a result it held, and I learned to locate the failure before adding weight.",
    }),
    q({
      id: "maj-eng-2",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["intermediate", "advanced"],
      major: "engineering",
      focus: "기술 선택을 쉬운 말로 설명",
      text: "How do you explain a technical choice to someone who will not use technical words?",
      keywords: ["explain", "choice", "because", "example", "result", "tradeoff", "cost", "simple"],
      model:
        "I start with the result the person cares about, then the choice, then the tradeoff. For example, I might say we picked a heavier material because it breaks less often, even though it costs more to move. The decision should be clear before the vocabulary.",
    }),
    q({
      id: "maj-ir-1",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["beginner", "intermediate", "advanced"],
      major: "ir",
      focus: "국제 이슈와 합의의 어려움",
      text: "Choose one global issue you follow. Why is it hard for countries to agree?",
      keywords: ["countries", "agree", "because", "cost", "issue", "however", "people", "climate"],
      model:
        "I follow disagreements about climate costs. It is hard for countries to agree because those that burned fuel earlier and those building industry now do not count the cost in the same way. However, delay is also a choice, and it pushes the price onto people who did not make the first decision.",
    }),
    q({
      id: "maj-ir-2",
      purposes: ["exchange", "internship", "admission"],
      difficulties: ["intermediate", "advanced"],
      major: "ir",
      expectsStar: true,
      focus: "반대 입장을 공정하게 설명",
      text: "Tell me about a time you explained the other side of an argument fairly.",
      keywords: ["argument", "other", "side", "because", "explained", "result", "disagreed", "evidence"],
      model:
        "In a class debate I disagreed with a border policy, but my role was to explain the security argument before I answered it. I stated the strongest version, including the fear of sudden change, and then showed where the evidence was thin. As a result the discussion became more precise, and a fair summary made my own point harder to dismiss.",
    }),
  ];

  const root = typeof window !== "undefined" ? window : globalThis;
  root.InterviewData = { meta: meta, bank: bank };
})();
