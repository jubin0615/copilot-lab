"""
금 시세 크롤링
-> 한국금거래소 사이트에서 금 시세 데이터를 크롤링하여 엑셀 파일로 저장
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import time
from datetime import datetime

def setup_driver():
    """Chrome 드라이버 설정"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # 브라우저 창 없이 실행
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--log-level=3')  # 로그 레벨 설정
    
    # ChromeDriver 자동 설치 및 설정
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def crawl_gold_prices(target_count=300):
    """금 시세 데이터 크롤링"""
    url = "https://www.koreagoldx.co.kr/price/gold"
    
    driver = setup_driver()
    all_data = []
    
    try:
        driver.get(url)
        
        # 페이지 로딩 대기
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.ID, "example-table")))
        time.sleep(2)  # 추가 대기
        
        page = 1
        
        while len(all_data) < target_count:
            print(f"\n페이지 {page} 크롤링 중...")
            
            # 테이블 행 찾기
            rows = driver.find_elements(By.CSS_SELECTOR, ".tabulator-row")
            
            if not rows:
                print("더 이상 데이터가 없습니다.")
                break
            
            # 각 행의 데이터 추출
            for row in rows:
                if len(all_data) >= target_count:
                    break
                
                try:
                    cells = row.find_elements(By.CSS_SELECTOR, ".tabulator-cell")
                    
                    if len(cells) >= 3:
                        date = cells[0].text.strip()
                        s_pure = cells[1].text.strip().replace(',', '')
                        p_pure = cells[2].text.strip().replace(',', '')
                        
                        data = {
                            '고시날짜': date,
                            '내가 살 때(순금)': int(s_pure) if s_pure else None,
                            '내가 팔 때(순금)': int(p_pure) if p_pure else None
                        }
                        
                        all_data.append(data)
                        
                except Exception as e:
                    print(f"행 데이터 추출 오류: {e}")
                    continue
            
            print(f"현재까지 수집된 데이터: {len(all_data)}개")
            
            # 목표 달성 시 종료
            if len(all_data) >= target_count:
                break
            
            # 다음 페이지로 이동
            try:
                next_button = driver.find_element(By.CSS_SELECTOR, 'button.tabulator-page[data-page="next"]')
                
                if next_button.is_enabled() and not next_button.get_attribute('disabled'):
                    next_button.click()
                    time.sleep(2)  # 페이지 로딩 대기
                    page += 1
                else:
                    break
                    
            except Exception as e:
                print(f"다음 페이지 이동 오류: {e}")
                break
        
    except Exception as e:
        print(f"크롤링 오류: {e}")
        
    finally:
        driver.quit()
    
    return all_data

def save_to_excel(data, filename=None):
    """데이터를 엑셀 파일로 저장"""
    if not data:
        return
    
    # 파일명 생성
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gold_prices_{timestamp}.xlsx"
    
    # DataFrame 생성
    df = pd.DataFrame(data)
    
    # 엑셀 파일로 저장
    df.to_excel(filename, index=False, engine='openpyxl')

if __name__ == "__main__":
    print("=== 금 시세 크롤링 시작 ===\n")
    
    # 크롤링 실행
    data = crawl_gold_prices(target_count=300)
    
    # 엑셀 파일로 저장
    if data:
        save_to_excel(data)
        print("\n=== 크롤링 완료 ===")
    else:
        print("\n크롤링된 데이터가 없습니다.")
