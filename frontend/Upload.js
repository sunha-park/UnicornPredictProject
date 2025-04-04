import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import axios from 'axios';

const Upload = () => {
  const [formData, setFormData] = useState({
    year: "",
    company: "",
    asset: "",
    debt: "",
    capital: "",
    income: "",
    cost: "",
    profit: "",
    net_income: "",
    investment: "",
    unicorn: "",
  });

  const [file, setFile] = useState(null);
  const [data, setData] = useState([]); // 전체 데이터 상태
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  // 데이터 저장 API 호출
  const saveData = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://34.64.136.227:5001/save_data", formData);
      alert(response.data.message);
    } catch (error) {
      alert(error.response?.data?.error || "Error occurred");
    }
  };

  // 엑셀 저장 API 호출
  const uploadExcel = async (e) => {
    e.preventDefault();
    if (!file) {
        alert("Please upload a file");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axios.post("http://34.64.136.227:5001/insert_excel", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        alert(response.data.message);
    } catch (error) {
        console.error("Error uploading file:", error);
        alert(error.response?.data?.error || "An error occurred");
    }
  };

  // 엑셀 삭제 API 호출
  const deleteExcel = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a file");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://34.64.136.227:5001/delete_excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(response.data.message);
    } catch (error) {
      alert(error.response?.data?.error || "Error occurred");
    }
  };

  // 데이터 가져오는 함수
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        const response = await axios.get('http://34.64.136.227:5001/all_data');
        const responseData = response.data?.data || []; // undefined일 경우 빈 배열 설정
        setData(responseData);
    } catch (err) {
        setError('Failed to fetch data');
    } finally {
        setLoading(false);
    }
  };
   // 컴포넌트 마운트 시 데이터 로드
   useEffect(() => {
    fetchData();
  }, []);

  const columnDefs = [
    { headerName: "연도", field: "year", sortable: true, filter: true },
    { headerName: "회사명", field: "company", sortable: true, filter: true },
    { headerName: "자산", field: "asset", sortable: true, filter: true },
    { headerName: "부채", field: "debt", sortable: true, filter: true },
    { headerName: "자본", field: "capital", sortable: true, filter: true },
    { headerName: "매출액", field: "income", sortable: true, filter: true },
    { headerName: "영업비용", field: "cost", sortable: true, filter: true },
    { headerName: "영업이익", field: "profit", sortable: true, filter: true },
    { headerName: "당기순이익", field: "net_income", sortable: true, filter: true },
    { headerName: "투자유치금액", field: "investment", sortable: true, filter: true },
    { headerName: "유니콘여부", field: "unicorn", sortable: true, filter: true },
  ];



  // 공통 스타일 변수
  const sectionStyle = {
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#f7f7f7",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    marginBottom: '30px'
  };

  const headerStyle = {
    paddingLeft: "10px",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "2px solid #007BFF",
    color: "#333",
  };

  const inputStyle = {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "16px",
  };

  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginTop: "10px",
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
      <header
          style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              zIndex: 1000,
              display: 'flex', // 플렉스 컨테이너 설정
              justifyContent: 'space-between', // 좌우 정렬
              alignItems: 'center', // 세로 가운데 정렬
              padding: '10px 20px', // 상하좌우 여백
              textAlign: 'center',
              backgroundColor: '#007BFF',
              color: 'white',
          }}
            >
      {/* 헤더 좌측: 제목과 설명 */}
      <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '30px' }}>Data Management</h1>
      </div>

      {/* 헤더 우측: 버튼 그룹 */}
      <div style={{ display: 'flex', gap: '10px', marginRight: '70px' }}> {/* 버튼 간격 10px 설정 */}
          <button
              onClick={() => window.location.href = '/predict'}
              style={{
                  padding: '10px 20px',
                  background: 'None',
                  color: 'white',
                  border: '1px solid white', // 테두리 추가로 시각적 구분
                  borderRadius: '5px',
                  cursor: 'pointer',
              }}
          >
              예측하기
          </button>
        </div>
      </header>
      <div style={{marginTop: '130px'}}>
        {/* 데이터 저장 섹션 */}
        <div style={sectionStyle}>
          <h2 style={headerStyle}>Save Data</h2>
          <form onSubmit={saveData} style={{ display: "grid", gap: "10px" }}>
            {Object.keys(formData).map((key) => (
              <div key={key}>
                <label style={{ fontWeight: "bold" }}>{key.toUpperCase()}</label>
                <input
                  type="text"
                  value={formData[key]}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
            ))}
            <button type="submit" style={buttonStyle}>
              Save
            </button>
          </form>
        </div>

        {/* 엑셀 업로드 및 삭제 섹션 */}
        <div style={sectionStyle}>
          <h2 style={headerStyle}>Manage Excel</h2>
          <form onSubmit={uploadExcel} style={{ marginBottom: "10px" }}>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} style={inputStyle} required />
            <button type="submit" style={buttonStyle}>
              Upload Excel
            </button>
          </form>

          <form onSubmit={deleteExcel}>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} style={inputStyle} required />
            <button type="submit" style={{ ...buttonStyle, backgroundColor: "#dc3545" }}>
              Delete Excel
            </button>
          </form>
        </div>

        {/* 전체 데이터 조회 섹션 */}
        <div style={sectionStyle}>
          <h2 style={headerStyle}>All Data</h2>
          <button onClick={fetchData} style={buttonStyle}>
            Refresh
          </button>

          {loading ? (
            <p style={{ color: "#007BFF", textAlign: "center" }}>Loading data...</p>
          ) : error ? (
            <p style={{ color: "red", textAlign: "center" }}>{error}</p>
          ) : data.length > 0 ? (
            <div className="ag-theme-alpine" style={{ height: 500, width: "100%", marginTop: "20px" }}>
              <AgGridReact columnDefs={columnDefs} rowData={data} pagination paginationPageSize={10} />
            </div>
          ) : (
            <p style={{ color: "gray", textAlign: "center" }}>No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
