import httpx
from typing import Dict, List, Optional
from loguru import logger

from app.config import settings


class ExternalServiceClient:
    """HTTP client for communicating with other microservices"""

    def __init__(self):
        self.timeout = 30.0
        self.patient_service_url = settings.patient_service_url
        self.vitals_service_url = settings.vitals_service_url

    async def get_patient_data(self, patient_id: str) -> Optional[Dict]:
        """Fetch patient data from Patient Service"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.patient_service_url}/api/v1/patients/{patient_id}"
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching patient data: {str(e)}")
            return None

    async def get_patient_vitals(
        self, patient_id: str, days: int = 7
    ) -> List[Dict]:
        """Fetch patient vital signs from Vitals Service"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.vitals_service_url}/api/v1/vitals/patient/{patient_id}",
                    params={"days": days},
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching vitals: {str(e)}")
            return []

    async def get_vital_trends(
        self, patient_id: str, vital_type: str, days: int = 7
    ) -> Optional[Dict]:
        """Fetch vital sign trends from Vitals Service"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.vitals_service_url}/api/v1/vitals/patient/{patient_id}/trends/{vital_type}",
                    params={"days": days},
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching vital trends: {str(e)}")
            return None

    async def get_medical_history(self, patient_id: str) -> List[Dict]:
        """Fetch patient medical history from Patient Service"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.patient_service_url}/api/v1/medical-records/patient/{patient_id}"
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching medical history: {str(e)}")
            return []
