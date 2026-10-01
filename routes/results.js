const express=require("express");
const db=require("../lib/db");
const {requireRole}=require("../lib/auth");
const {sendParentAlert}=require("../lib/notifier");
const router=express.Router();
function notify(data,studentId,title,message){data.notifications.push({id:db.nextId(data),studentId,title,message,type:"result",createdAt:new Date().toISOString(),studentSeen:false,parentSeen:false});}
function canSeeStudent(data,req,student){if(req.session.user.role!=="teacher")return true;const t=data.teachers.find(x=>x.id===req.session.user.id);return !!t&&( !t.className || String(t.className).trim()===String(student.className).trim());}
router.post("/",requireRole("admin","teacher"),(req,res)=>{
 const {studentId,term,examName,subjectId,maxMarks,obtained}=req.body;if(!studentId||!examName||!subjectId||maxMarks===undefined||obtained===undefined)return res.status(400).json({error:"student, exam, subject and marks are required"});
 const data=db.load(),student=data.students.find(s=>s.id===studentId),subject=data.subjects.find(s=>s.id===subjectId);if(!student)return res.status(404).json({error:"Student not found"});if(!subject)return res.status(404).json({error:"Subject not found in Subject Master"});
 if(String(subject.className).trim()!==String(student.className).trim())return res.status(400).json({error:"Selected subject does not belong to this student's class"});
 if(req.session.user.role==="teacher"){const t=data.teachers.find(x=>x.id===req.session.user.id);if(!canSeeStudent(data,req,student))return res.status(403).json({error:"This student is outside your assigned class"});if(subject.teacherId&&subject.teacherId!==t.id)return res.status(403).json({error:"You are not assigned to this subject"});}
 const max=Number(maxMarks),got=Number(obtained);if(!Number.isFinite(max)||max<=0||!Number.isFinite(got)||got<0||got>max)return res.status(400).json({error:"Invalid marks"});
 const termKey=String(term||"").trim(),examKey=String(examName).trim();let result=data.results.find(r=>r.studentId===studentId&&String(r.term||"").trim()===termKey&&r.examName===examKey&&r.subjectId===subjectId);
 if(result){result.maxMarks=max;result.obtained=got;result.subject=subject.name;result.updatedAt=new Date().toISOString();}
 else {result={id:db.nextId(data),studentId,term:termKey,examName:examKey,subjectId,subject:subject.name,maxMarks:max,obtained:got,postedAt:new Date().toISOString()};data.results.push(result);}
 notify(data,studentId,result.updatedAt?"Result updated":"New result posted",`${examKey} - ${subject.name}: ${got}/${max}. Please check the portal.`);db.save(data);sendParentAlert(student,`Result ${result.updatedAt?"updated":"posted"} for ${student.name}: ${examKey} - ${subject.name} (${got}/${max}). Please check the portal.`);res.json({result,updated:!!result.updatedAt});
});
router.get("/student/:studentId",requireRole("admin","teacher"),(req,res)=>{const d=db.load(),s=d.students.find(x=>x.id===req.params.studentId);if(!s)return res.status(404).json({error:"Student not found"});if(!canSeeStudent(d,req,s))return res.status(403).json({error:"Not allowed"});res.json({results:d.results.filter(r=>r.studentId===s.id)});});
router.get("/mine",requireRole("student"),(req,res)=>{const d=db.load();res.json({results:d.results.filter(r=>r.studentId===req.session.user.id)});});
router.get("/parent",requireRole("parent"),(req,res)=>{const d=db.load();res.json({results:d.results.filter(r=>r.studentId===req.session.user.studentId)});});
router.delete("/:id",requireRole("admin"),(req,res)=>{const d=db.load(),before=d.results.length;d.results=d.results.filter(r=>r.id!==req.params.id);if(before===d.results.length)return res.status(404).json({error:"Result not found"});db.save(d);res.json({ok:true});});
module.exports=router;
