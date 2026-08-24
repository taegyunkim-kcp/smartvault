function ComingSoonPage({ title, description }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{description || '백엔드 API가 준비되면 연결될 화면입니다.'}</p>
    </div>
  );
}

export default ComingSoonPage;
