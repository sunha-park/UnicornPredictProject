import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import ClipLoader from "react-spinners/ClipLoader";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Predict = () => {
  const gridRef = useRef(null); // gridRef 정의
  const [file, setFile] = useState(null);
  const [uploadedData, setUploadedData] = useState([]); // 원본 데이터
  const [sortedData, setSortedData] = useState([]); // 정렬된 데이터
  const [predictionResult, setPredictionResult] = useState(null);
  const [graphType, setGraphType] = useState("line");
  const [selectedFeature, setSelectedFeature] = useState("all");
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState(null); // 에러 상태
  const [loading, setLoading] = useState(false);
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
  });
  const [showFormType, setShowFormType] = useState(""); // 폼 표시 타입: 'upload' 또는 'manual'
  const [showVisualization, setShowVisualization] = useState(false); // 초기값 false

  const colorPalette = [
    "#3f51b5",
    "#2196f3",
    "#ff5722",
    "#ff9800",
    "#9c27b0",
    "#03a9f4",
    "#8bc34a",
    "#e91e63",
  ];

  // Fetch uploaded data for visualization
  const fetchUploadedData = async () => {
    setLoading(true); // 데이터 로딩 시작 표시
    setError(null); // 기존 에러 초기화
    try {
      const response = await axios.get("http://34.64.136.227:5001/fetch_uploaded_data");
      const fetchedData = response.data.data;

      // 연도 기준으로 정렬
      const sorted = fetchedData.sort((a, b) => new Date(a.year) - new Date(b.year));
      setUploadedData(fetchedData);
      setSortedData(sorted);

      // 특징(feature) 목록 생성
      setFeatures(Object.keys(fetchedData[0]).filter((key) => key !== "year" && key !== "company"));
    } catch (error) {
      console.error("Error fetching uploaded data:", error);
      setError("Failed to fetch uploaded data.");
    } finally {
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchUploadedData();
  }, []);

  // 행 삭제
  const deleteSelectedRows = async () => {
    if (!gridRef.current) {
      console.error("Grid reference is not available.");
      return;
    }
    // 선택된 행 가져오기
    const selectedNodes = gridRef.current.api.getSelectedNodes(); // 선택된 노드 가져오기
    console.log("Selected Nodes:", selectedNodes);
    const selectedData = selectedNodes.map((node) => node.data); // 선택된 데이터
    console.log("Selected Data:", selectedData);
    const selectedIds = selectedData.map((row) => row.id).filter((id) => id !== null && id !== undefined); // 유효한 ID만 필터링

    console.log("Selected IDs to delete:", selectedIds); // 확인용 출력

    if (selectedIds.length === 0) {
      alert("Please select at least one row to delete.");
      return;
    }

    try {
      const response = await axios.post("http://34.64.136.227:5001/delete_rows", { ids: selectedIds });
      if (response.data.success) {
        alert("Selected rows deleted successfully.");
        fetchUploadedData(); // 데이터 갱신
      } else {
        alert(response.data.message);
      }
    } catch (err) {
      console.error("Error deleting rows:", err);
      setError("Failed to delete rows.");
    }
  };

  // Ag-Grid의 열 정의
  const columnDefs = [
    {
      headerCheckboxSelection: true, // 헤더에 체크박스 추가
      checkboxSelection: true, // 각 행에 체크박스 추가
      headerName: "",
      width: 50,
    },
    { headerName: "YEAR", field: "year", sortable: true, filter: true },
    { headerName: "COMPANY", field: "company", sortable: true, filter: true },
    { headerName: "ASSET", field: "asset", sortable: true, filter: true },
    { headerName: "DEBT", field: "debt", sortable: true, filter: true },
    { headerName: "CAPITAL", field: "capital", sortable: true, filter: true },
    { headerName: "INCOME", field: "income", sortable: true, filter: true },
    { headerName: "COST", field: "cost", sortable: true, filter: true },
    { headerName: "PROFIT", field: "profit", sortable: true, filter: true },
    { headerName: "NET_INCOME", field: "net_income", sortable: true, filter: true },
    { headerName: "INVESTMENT", field: "investment", sortable: true, filter: true },
  ];

  // 파일 업로드
  const uploadExcel = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await axios.post("http://34.64.136.227:5001/insert_new_excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("File uploaded successfully");
      fetchUploadedData();
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload the file.");
    } finally {
      setLoading(false);
    }
  };

  // 데이터 입력 폼
  const insertData = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await axios.post("http://34.64.136.227:5001/insert_data", formData);
      alert(response.data.message);
      setFormData({
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
      });
      fetchUploadedData();
    } catch (error) {
      console.error("Error inserting data:", error);
      setError("Failed to insert data.");
    }
  };

  // 예측하기
  const predict = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://34.64.136.227:5001/predict");
      setPredictionResult(response.data);
    } catch (error) {
      console.error("Error fetching prediction:", error);
      setError("Failed to fetch prediction.");
    } finally {
      setLoading(false);
    }
  };
  
  // 차트 데이터 준비
  const getChartData = () => {
    if (!sortedData.length) return { labels: [], datasets: [] };

    const labels = sortedData.map((item) => item.year);
    const datasets =
    selectedFeature === "all"
      ? features.map((feature, index) => ({
          label: feature,
          data: sortedData.map((item) => {
            const value = item[feature] || 0; // 값이 없으면 0으로 대체
            return typeof value === "string"
              ? parseFloat(value.replace(/,/g, "")) // 문자열이면 쉼표 제거 후 숫자로 변환
              : parseFloat(value); // 숫자인 경우 그대로 사용
          }),
          borderColor: colorPalette[index % colorPalette.length],
          backgroundColor: `${colorPalette[index % colorPalette.length]}55`,
          fill: true,
          borderWidth: 2,
        }))
      : [
          {
            label: selectedFeature,
            data: sortedData.map((item) => {
              const value = item[selectedFeature] || 0; // 값이 없으면 0으로 대체
              return typeof value === "string"
                ? parseFloat(value.replace(/,/g, "")) // 문자열이면 쉼표 제거 후 숫자로 변환
                : parseFloat(value); // 숫자인 경우 그대로 사용
            }),
            borderColor: "#3f51b5",
            backgroundColor: "#3f51b5",
            fill: true,
            borderWidth: 2,
          },
        ];

  return { labels, datasets };
};

  const spinnerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "300px",
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
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '30px' }}>기업 유니콘 등극 가능성</h1>
                </div>

                {/* 헤더 우측: 버튼 그룹 */}
                <div style={{ display: 'flex', gap: '10px', marginRight: '70px' }}> {/* 버튼 간격 10px 설정 */}
                    <button
                        onClick={() => window.location.href = '/upload'}
                        style={{
                            padding: '10px 20px',
                            background: 'None',
                            color: 'white',
                            border: '1px solid white', // 테두리 추가로 시각적 구분
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        파일 업로드
                    </button>
                </div>
        </header>

        {/* 폼 선택 버튼 */}
        <div style={{ display: "flex", justifyContent: "left", gap: "10px", marginBottom: "30px", marginTop: "130px" }}>
          <button
            onClick={() => setShowFormType("upload")}
            style={{
              padding: "15px 30px",
              backgroundColor: showFormType === "upload" ? "#007BFF" : "#ccc", // 선택 상태에 따른 배경색
              color: "white", // 선택 상태에 따른 글자색
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              fontSize: "16px",
              fontWeight: "bold",
              transition: "all 0.3s ease", // 부드러운 색상 전환
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#007BFF"; // 마우스 오버 시 배경색 변경
              e.target.style.color = "white"; // 글자색 변경
            }}
            onMouseLeave={(e) => {
              if (showFormType !== "upload") {
                e.target.style.backgroundColor = "#ccc"; // 선택되지 않은 경우 기본 회색으로 복귀
                e.target.style.color = "white"; // 기본 글자색 복귀
              }
            }}
          >
            엑셀 파일 업로드
          </button>
          <button
            onClick={() => setShowFormType("manual")}
            style={{
              padding: "15px 30px",
              backgroundColor: showFormType === "manual" ? "#007BFF" : "#ccc", // 선택 상태에 따른 배경색
              color: "white", // 선택 상태에 따른 글자색
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              fontSize: "16px",
              fontWeight: "bold",
              transition: "all 0.3s ease", // 부드러운 색상 전환
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#007BFF"; // 마우스 오버 시 배경색 변경
              e.target.style.color = "white"; // 글자색 변경
            }}
            onMouseLeave={(e) => {
              if (showFormType !== "manual") {
                e.target.style.backgroundColor = "#ccc"; // 선택되지 않은 경우 기본 회색으로 복귀
                e.target.style.color = "white"; // 기본 글자색 복귀
              }
            }}
          >
            직접 입력
          </button>
        </div>

        {/* 업로드 폼 */}
        {showFormType === "upload" && (
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              marginBottom: "30px",
            }}
          >
            <form onSubmit={uploadExcel} style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                required
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: "2px solid #007BFF",
                  fontSize: "14px",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "12px 30px",
                  backgroundColor: "#007BFF",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
              >
                업로드
              </button>
            </form>
          </div>
        )}

        {/* 데이터 입력 폼 */}
        {showFormType === "manual" && (
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              marginBottom: "30px",
            }}
          >
            <form
              onSubmit={insertData}
              style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}
            >
              {Object.keys(formData).map((key) => (
                <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                  <label
                    htmlFor={key}
                    style={{
                      fontWeight: "bold",
                      marginBottom: "5px",
                      color: "#333",
                    }}
                  >
                    {key.toUpperCase()}
                  </label>
                  <input
                    id={key}
                    name={key}
                    type="text"
                    value={formData[key]}
                    placeholder={`${key} 입력`}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    required
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "2px solid #007BFF",
                    }}
                  />
                </div>
              ))}
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="submit"
                  style={{
                    padding: "12px 30px",
                    backgroundColor: "#007BFF",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                  onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        )}
      

        {/* 로딩 */}
        {loading && (
          <div
            style={{
              position: "fixed", // 화면에 고정
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.5)", // 어두운 반투명 배경
              zIndex: 1000, // 모든 요소 위에 표시
              display: "flex",
              justifyContent: "center", // 가로 정렬
              alignItems: "center", // 세로 정렬
            }}
          >
            <ClipLoader color="#ffffff" loading={true} size={50} />
          </div>
        )}

        {/* 삭제 버튼 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            onClick={deleteSelectedRows}
            style={{
              padding: "10px 25px",
              backgroundColor: "#ccc", // 기본 배경색 회색
              color: "white",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "background-color 0.3s, transform 0.2s", // 부드러운 전환 효과 추가
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#007BFF"; // 마우스 오버 시 파란색
              e.target.style.transform = "scale(1.05)"; // 크기 확대
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#ccc"; // 기본 상태로 복귀
              e.target.style.transform = "scale(1)"; // 크기 복귀
            }}
          >
            선택된 행 삭제
          </button>
        </div>


        {/* 데이터 테이블 */}
        <div className="ag-theme-alpine" style={{ height: 400, width: "100%", marginTop: "10px", backgroundColor: "#f7f9fc" }}>
          {sortedData.length > 0 ? (
            <AgGridReact
            ref={gridRef} // Ag-Grid 참조
            rowData={uploadedData}
            columnDefs={[
              {
                headerCheckboxSelection: true, // 헤더 체크박스 추가
                checkboxSelection: true, // 행별 체크박스 추가
                headerName: "",
                width: 50,
              },
              { headerName: "YEAR", field: "year", sortable: true, filter: true },
              { headerName: "COMPANY", field: "company", sortable: true, filter: true },
              { headerName: "ASSET", field: "asset", sortable: true, filter: true },
              { headerName: "DEBT", field: "debt", sortable: true, filter: true },
              { headerName: "CAPITAL", field: "capital", sortable: true, filter: true },
              { headerName: "INCOME", field: "income", sortable: true, filter: true },
              { headerName: "COST", field: "cost", sortable: true, filter: true },
              { headerName: "PROFIT", field: "profit", sortable: true, filter: true },
              { headerName: "NET_INCOME", field: "net_income", sortable: true, filter: true },
              { headerName: "INVESTMENT", field: "investment", sortable: true, filter: true },
            ]}
            rowSelection="multiple" // 다중 선택 가능
            pagination
            paginationPageSize={10}
            />
          ) : (
            <p style={{ textAlign: "center", color: "gray" }}>데이터를 먼저 업로드해주세요.</p>
          )}
        </div>

        
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <button
            onClick={() => {
              predict();
              setShowVisualization(true);
            }}
            style={{
              padding: "15px 30px",
              backgroundColor: "#007BFF",
              color: "white",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              fontSize: "16px",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            예측하기
          </button>
        </div>

        {/* 데이터 시각화 및 예측 결과 표시 */}
        {showVisualization && (
          <div
            style={{
              marginTop: "30px",
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              padding: "20px",
            }}
          >
            
            {/* 데이터 시각화 */}
            <h4
              style={{
                color: "#007BFF",
                fontSize: "20px",
                fontWeight: "bold",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              데이터 시각화
            </h4>
            <div
              style={{
                display: "flex",
                gap: "20px",
                marginBottom: "20px",
                justifyContent: "center",
              }}
            >
              <select
                value={graphType}
                onChange={(e) => setGraphType(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "2px solid #007BFF",
                  flex: 1,
                  maxWidth: "200px",
                  fontSize: "14px",
                  color: "#007BFF",
                  fontWeight: "bold",
                }}
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
              <select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "2px solid #007BFF",
                  flex: 1,
                  maxWidth: "200px",
                  fontSize: "14px",
                  color: "#007BFF",
                  fontWeight: "bold",
                }}
              >
                <option value="all">All Features</option>
                {features.map((feature) => (
                  <option key={feature} value={feature}>
                    {feature}
                  </option>
                ))}
              </select>
            </div>

            {/* 차트 */}
            <div
              style={{
                marginTop: "20px",
                textAlign: "center",
                minHeight: "300px", // 차트 공간 확보
              }}
            >
              {sortedData.length > 0 ? (
                graphType === "line" ? (
                  <Line data={getChartData()} />
                ) : (
                  <Bar data={getChartData()} />
                )
              ) : (
                <p style={{ color: "gray", fontSize: "16px" }}>데이터를 먼저 넣어주세요.</p>
              )}
            </div>
            
            {/* 예측 결과 박스 */}
            {predictionResult && (
              <div
                style={{
                  marginTop: "20px",
                  marginBottom: "20px",
                  padding: "20px",
                  border: "1px solid #007BFF",
                  backgroundColor: "#f0faff",
                  borderRadius: "10px",
                  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h4 style={{ color: "#007BFF", fontWeight: "bold", marginBottom: "10px" }}>
                  예측 결과
                </h4>
                <p>
                  <strong>유니콘 등극 가능성:</strong> {predictionResult.predicted_probability}
                </p>
                <p>
                  <strong>유니콘 등극 여부:</strong>{" "}
                  <span style={{ color: predictionResult.is_unicorn ? "green" : "red" }}>
                    {predictionResult.is_unicorn ? "축하합니다 ! 유니콘으로 등극되었습니다." : "아쉽지만 유니콘 등극에 실패하였습니다."}
                  </span>
                </p>
              </div>
            )}


          </div>
        )}

    </div>
  );
};
export default Predict;
