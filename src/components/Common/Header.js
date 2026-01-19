// src/components/common/Header.js
import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { AuthContext } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { MdOutlineSportsRugby } from "react-icons/md";
import { API_BASE_URL } from "../../config";

const AppHeader = () => {
  const {
    currentUser,
    currentClub,
    setCurrentClub,
    setCurrentUser,
    currentDisciplina,
    setCurrentDisciplina,
  } = useContext(AuthContext);
  const [clubes, setClubes] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const navigate = useNavigate();

  // 🔹 Traer clubes del usuario
  useEffect(() => {
    const fetchClubes = async () => {
      if (!currentUser?.codpersona) return;
      try {
        const resp = await axios.post(
          `${API_BASE_URL}/clubes_persona`,
          { codpersona: currentUser.codpersona },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setClubes(resp.data);
        // Si solo hay 1 club → auto-selección
        if (resp.data.length === 1) {
          setCurrentClub(resp.data[0]);
        }
      } catch (err) {
        console.error("Error cargando clubes:", err);
      }
    };
    fetchClubes();
  }, [currentUser, setCurrentClub]);

  useEffect(() => {
    const fetchDisciplinas = async () => {
      if (!currentClub?.codclub) return;
      try {
        const resp = await axios.post(
          `${API_BASE_URL}/disciplinas_club`,
          { codclub: currentClub.codclub },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setDisciplinas(resp.data);
        // Si solo hay 1 → autoseleccionar
        if (resp.data.length === 1) {
          setCurrentDisciplina(resp.data[0]);
        }
      } catch (err) {
        console.error("Error cargando disciplinas:", err);
      }
    };
    fetchDisciplinas();
  }, [currentClub]);

  return (
    <HeaderContainer>
      {/* PRIMERA FILA (móvil): Usuario + Cerrar sesión */}
      <TopRow>
        <UserInfo>
          {currentUser?.photoURL && (
            <Avatar src={currentUser.photoURL} alt={currentUser.persona} />
          )}
          <UserName>{currentUser?.apodo || currentUser?.email}</UserName>
        </UserInfo>
        <LogoutButton
          onClick={() => {
            localStorage.removeItem("token");
            setCurrentUser(null);
            setCurrentClub(null);
            navigate("/");
          }}
        >
          Cerrar sesión
        </LogoutButton>
      </TopRow>

      {/* SEGUNDA FILA (móvil): Logo + Selects */}
      <BottomRow>
        {/* Logo solo visible en desktop */}
        <DesktopLogo>
          <AppNombre>ClubIp</AppNombre>
          <MdOutlineSportsRugby size={30} color="#1877f2" />
        </DesktopLogo>

        {/* Contenedor de selects */}
        <SelectsContainer>
          <SelectClub
            value={currentClub?.codclub || ""}
            onChange={(e) => {
              const clubSel = clubes.find((c) => c.codclub == e.target.value);
              setCurrentClub(clubSel);
            }}
          >
            <option value="" disabled>
              Seleccionar club...
            </option>
            {clubes.map((club) => (
              <option key={club.codclub} value={club.codclub}>
                {club.descripcion}
              </option>
            ))}
          </SelectClub>

          <SelectDisciplina
            value={currentDisciplina?.coddisciplina || ""}
            onChange={(e) => {
              const discSel = disciplinas.find(
                (d) => d.coddisciplina == e.target.value
              );
              setCurrentDisciplina(discSel);
            }}
          >
            <option value="" disabled>
              Disciplina…
            </option>
            {disciplinas.map((d) => (
              <option key={d.coddisciplina} value={d.coddisciplina}>
                {d.descripcion}
              </option>
            ))}
          </SelectDisciplina>
        </SelectsContainer>
      </BottomRow>
    </HeaderContainer>
  );
};

export default AppHeader;

/* ============================
   = STYLED COMPONENTS =
   ============================ */

const HeaderContainer = styled.header`
  display: flex;
  flex-direction: column;
  width: 100%;
  background: #ffffff;
  border-bottom: 1px solid #eaeaea;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  padding: 1rem 1.5rem;

  @media (min-width: 769px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
  }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1rem;

  @media (min-width: 769px) {
    margin-bottom: 0;
    width: auto;
  }
`;

const BottomRow = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;

  @media (min-width: 769px) {
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
    width: auto;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const DesktopLogo = styled.div`
  display: none;

  @media (min-width: 769px) {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const SelectsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;

  @media (min-width: 769px) {
    flex-direction: row;
    align-items: center;
    gap: 15px;
    width: auto;
  }
`;

const AppNombre = styled.strong`
  font-size: 2.2rem;
  font-weight: 700;
  background: linear-gradient(90deg, #2c3e50 0%, #3498db 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const SelectClub = styled.select`
  padding: 10px 20px;
  border-radius: 25px;
  background: #eef3f9;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: #34495e;
  cursor: pointer;
  width: 100%;
  text-align: center;

  &:focus {
    outline: none;
    background: #d9e6f8;
  }

  @media (min-width: 769px) {
    width: auto;
    text-align: left;
  }

  @media (max-width: 480px) {
    padding: 10px 16px;
    font-size: 14px;
  }
`;

const SelectDisciplina = styled.select`
  padding: 10px 20px;
  border-radius: 25px;
  background: #f4f6fa;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #2d3436;
  cursor: pointer;
  width: 100%;
  text-align: center;

  &:focus {
    outline: none;
    background: #e6ecf7;
  }

  @media (min-width: 769px) {
    width: auto;
    text-align: left;
  }

  @media (max-width: 480px) {
    padding: 10px 16px;
    font-size: 13px;
  }
`;

const Avatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #ecf0f1;

  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
  }
`;

const UserName = styled.span`
  font-weight: 500;
  color: #34495e;
  font-size: 1.95rem;
  margin-right: 15px;

  @media (max-width: 480px) {
    font-size: 1.85rem;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const LogoutButton = styled.button`
  padding: 6px 14px;
  background: #ecf0f1;
  color: #7f8c8d;
  border: 1px solid #d5d8dc;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: #e4e7e7;
    color: #5d6d7e;
  }

  @media (max-width: 480px) {
    padding: 5px 12px;
    font-size: 0.85rem;
  }
`;